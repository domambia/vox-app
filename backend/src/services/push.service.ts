import prisma from "@/config/database";
import { logger } from "@/utils/logger";
import { randomUUID } from "crypto";
import { createSign } from "crypto";
import { createPrivateKey } from "crypto";

interface PushData {
  [key: string]: string;
}

class PushService {
  private _oauthToken: string | null = null;
  private _oauthTokenExpiry = 0;

  private _base64Url(input: string): string {
    return Buffer.from(input)
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }

  private _normalizePrivateKey(privateKeyRaw: string): string {
    if (!privateKeyRaw) return "";

    let normalized = privateKeyRaw.trim();

    // Handle keys copied with surrounding quotes from shell/env files.
    if (
      (normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'"))
    ) {
      normalized = normalized.slice(1, -1).trim();
    }

    // Handle escaped JSON/env newlines.
    normalized = normalized.replace(/\\n/g, "\n");

    // Allow base64-encoded PEM value.
    if (!normalized.includes("BEGIN PRIVATE KEY")) {
      try {
        const decoded = Buffer.from(normalized, "base64").toString("utf8");
        if (decoded.includes("BEGIN PRIVATE KEY")) {
          normalized = decoded;
        }
      } catch {
        // Ignore decode errors; validation happens below.
      }
    }

    return normalized.trim();
  }

  private _readFirebaseConfig() {
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || "";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim() || "";
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY || "";
    const privateKey = this._normalizePrivateKey(privateKeyRaw);
    return { projectId, clientEmail, privateKey };
  }

  private async _getGoogleAccessToken(): Promise<string | null> {
    const now = Date.now();
    if (this._oauthToken && now < this._oauthTokenExpiry - 60_000) {
      return this._oauthToken;
    }

    const { clientEmail, privateKey } = this._readFirebaseConfig();
    if (!clientEmail || !privateKey) {
      logger.warn(
        "Firebase service account credentials missing; set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY",
      );
      return null;
    }

    const iat = Math.floor(now / 1000);
    const exp = iat + 3600;
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp,
    };

    const unsignedToken = `${this._base64Url(JSON.stringify(header))}.${this._base64Url(JSON.stringify(payload))}`;
    const signer = createSign("RSA-SHA256");
    signer.update(unsignedToken);
    signer.end();
    let signature: string;
    try {
      const key = createPrivateKey({
        key: privateKey,
        format: "pem",
      });
      signature = signer
        .sign(key, "base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    } catch (error) {
      logger.error("Invalid FIREBASE_PRIVATE_KEY format", error);
      return null;
    }
    const assertion = `${unsignedToken}.${signature}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      logger.warn("Failed to obtain Google OAuth token for FCM", {
        status: tokenRes.status,
        body: errText,
      });
      return null;
    }

    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!tokenJson.access_token) {
      logger.warn("Google OAuth token response missing access_token");
      return null;
    }

    this._oauthToken = tokenJson.access_token;
    this._oauthTokenExpiry = now + (tokenJson.expires_in || 3600) * 1000;
    return this._oauthToken;
  }

  async upsertToken(userId: string, token: string, platform: string) {
    const cleanToken = token.trim();
    if (!cleanToken) {
      throw new Error("Push token is required");
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO push_tokens (push_token_id, user_id, token, platform, is_active, last_seen_at, created_at, updated_at)
       VALUES ($4, $1, $2, $3, true, NOW(), NOW(), NOW())
       ON CONFLICT (token)
       DO UPDATE SET user_id = EXCLUDED.user_id,
                     platform = EXCLUDED.platform,
                     is_active = true,
                     last_seen_at = NOW(),
                     updated_at = NOW()`,
      userId,
      cleanToken,
      platform || "unknown",
      randomUUID(),
    );

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        push_token_id: string;
        token: string;
        platform: string;
        is_active: boolean;
      }>
    >(
      `SELECT push_token_id, token, platform, is_active
       FROM push_tokens
       WHERE token = $1
       LIMIT 1`,
      cleanToken,
    );
    return rows[0];
  }

  async deactivateToken(userId: string, token: string) {
    return prisma.$executeRawUnsafe(
      `UPDATE push_tokens
       SET is_active = false, updated_at = NOW()
       WHERE user_id = $1 AND token = $2`,
      userId,
      token,
    );
  }

  async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: PushData,
  ) {
    const { projectId } = this._readFirebaseConfig();
    if (!projectId) {
      logger.warn("FIREBASE_PROJECT_ID is not configured; skipping push send");
      return;
    }

    const accessToken = await this._getGoogleAccessToken();
    if (!accessToken) {
      return;
    }

    if (userIds.length == 0) return;

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        token: string;
        user_id: string;
      }>
    >(
      `SELECT token, user_id
       FROM push_tokens
       WHERE is_active = true
         AND user_id = ANY($1::text[])`,
      userIds,
    );
    if (rows.length === 0) return;

    const uniqueTokens = [
      ...new Set(rows.map((r: { token: string }) => r.token).filter(Boolean)),
    ];

    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    await Promise.all(
      uniqueTokens.map(async (token) => {
        try {
          const res = await fetch(fcmEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title, body },
                data: data ?? {},
                android: {
                  priority: "high",
                },
                apns: {
                  headers: {
                    "apns-priority": "10",
                  },
                },
              },
            }),
          });

          if (!res.ok) {
            const text = await res.text();
            logger.warn("Failed to send FCM push", {
              status: res.status,
              body: text,
            });
            if (
              res.status === 404 ||
              text.includes("UNREGISTERED") ||
              text.includes("registration-token-not-registered")
            ) {
              await prisma.$executeRawUnsafe(
                `UPDATE push_tokens
                 SET is_active = false, updated_at = NOW()
                 WHERE token = $1`,
                token,
              );
            }
          }
        } catch (error) {
          logger.error("Error sending FCM push", error);
        }
      }),
    );
  }
}

const pushService = new PushService();
export default pushService;
