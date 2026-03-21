import prisma from "@/config/database";
import { logger } from "@/utils/logger";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import admin from "firebase-admin";

/** Must match `liamapp_messages` in AndroidManifest + NotificationService. */
const ANDROID_NOTIFICATION_CHANNEL_ID = "liamapp_messages";

interface PushData {
  [key: string]: string | number | boolean | undefined | null;
}

class PushService {
  /** Avoid spamming logs when every message tries to push without Firebase configured. */
  private _loggedMissingFirebase = false;
  private _loggedNoTokensForUsers = false;

  private _normalizePrivateKey(privateKeyRaw: string): string {
    if (!privateKeyRaw) return "";

    let normalized = privateKeyRaw.trim();

    if (
      (normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'"))
    ) {
      normalized = normalized.slice(1, -1).trim();
    }

    normalized = normalized.replace(/\\n/g, "\n");

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

  /**
   * FCM requires every `data` value to be a string. Non-string values cause send failures.
   */
  private _stringifyData(data?: PushData): Record<string, string> {
    if (!data) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) continue;
      out[key] = typeof value === "string" ? value : String(value);
    }
    return out;
  }

  private _ensureFirebaseApp(): admin.app.App | null {
    if (admin.apps.length > 0) {
      return admin.app();
    }

    const { projectId, clientEmail, privateKey } = this._readFirebaseConfig();
    if (!projectId || !clientEmail || !privateKey) {
      logger.warn(
        "Firebase Admin credentials incomplete; set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY",
      );
      return null;
    }

    try {
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (error) {
      logger.error("Firebase Admin initialization failed", error);
      return null;
    }
  }

  private async _deactivateInvalidToken(token: string) {
    await prisma.$executeRawUnsafe(
      `UPDATE push_tokens
       SET is_active = false, updated_at = NOW()
       WHERE token = $1`,
      token,
    );
  }

  private _shouldDeactivateToken(code: string): boolean {
    return (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
    );
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

  /**
   * Call once at server startup so operators see immediately if push cannot work.
   */
  logConfigurationStatus(): void {
    const { projectId, clientEmail, privateKey } = this._readFirebaseConfig();
    if (!projectId || !clientEmail || !privateKey) {
      logger.warn(
        "Push notifications are DISABLED: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (service account JSON fields) in the backend environment.",
      );
    } else {
      logger.info(
        "Firebase push: Admin credentials present; FCM will be used when sending.",
      );
    }
  }

  async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: PushData,
  ) {
    const app = this._ensureFirebaseApp();
    if (!app) {
      if (!this._loggedMissingFirebase) {
        this._loggedMissingFirebase = true;
        logger.warn(
          "Push send skipped: Firebase Admin is not configured (missing or invalid env). Subsequent skips will be silent.",
        );
      }
      return;
    }

    if (userIds.length === 0) return;

    const rows = await prisma.$queryRaw<
      Array<{
        token: string;
        user_id: string;
      }>
    >`
      SELECT token, user_id
      FROM push_tokens
      WHERE is_active = true
        AND user_id IN (${Prisma.join(userIds)})
    `;

    if (rows.length === 0) {
      if (!this._loggedNoTokensForUsers) {
        this._loggedNoTokensForUsers = true;
        logger.warn(
          "Push send skipped: no active FCM tokens in push_tokens for the target user(s). Ensure the app called POST /notifications/push-token after login.",
          { userIds },
        );
      }
      return;
    }

    const uniqueTokens = [
      ...new Set(rows.map((r) => r.token).filter(Boolean)),
    ];

    const messaging = admin.messaging(app);
    const dataPayload = this._stringifyData(data);

    const batchSize = 500;
    for (let i = 0; i < uniqueTokens.length; i += batchSize) {
      const batch = uniqueTokens.slice(i, i + batchSize);
      try {
        const response = await messaging.sendEachForMulticast({
          tokens: batch,
          notification: { title, body },
          data: dataPayload,
          android: {
            priority: "high",
            notification: {
              channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
            },
          },
          apns: {
            headers: {
              "apns-priority": "10",
            },
            payload: {
              aps: {
                sound: "default",
              },
            },
          },
        });

        logger.info("FCM multicast result", {
          successCount: response.successCount,
          failureCount: response.failureCount,
          tokenBatchSize: batch.length,
        });

        if (response.failureCount > 0) {
          response.responses.forEach((resp, idx) => {
            if (resp.success || !resp.error) return;
            const err = resp.error;
            logger.warn("FCM send failed for token batch item", {
              code: err.code,
              message: err.message,
            });
            const token = batch[idx];
            if (token && this._shouldDeactivateToken(err.code)) {
              void this._deactivateInvalidToken(token);
            }
          });
        }
      } catch (error) {
        logger.error("FCM sendEachForMulticast error", error);
      }
    }
  }
}

const pushService = new PushService();
export default pushService;
