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

/** Avoid logging full FCM registration tokens. */
function maskFcmToken(token: string): string {
  const t = token.trim();
  if (t.length <= 14) return "(short token)";
  return `${t.slice(0, 8)}…${t.slice(-6)} (${t.length} chars)`;
}

class PushService {
  /** Avoid spamming logs when every message tries to push without Firebase configured. */
  private _loggedMissingFirebase = false;

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
      const app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      logger.info("Firebase Admin SDK initialized for FCM", {
        projectId,
        clientEmail,
      });
      return app;
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
    logger.info("Push token deactivated (invalid/expired per FCM)", {
      token: maskFcmToken(token),
    });
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
    const row = rows[0];
    logger.info("Push token registered or refreshed", {
      userId,
      platform: platform || "unknown",
      token: maskFcmToken(cleanToken),
      pushTokenId: row?.push_token_id,
      isActive: row?.is_active,
    });
    return row;
  }

  async deactivateToken(userId: string, token: string) {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE push_tokens
       SET is_active = false, updated_at = NOW()
       WHERE user_id = $1 AND token = $2`,
      userId,
      token,
    );
    logger.info("Push token deactivate requested", {
      userId,
      token: maskFcmToken(token),
      rowsAffected: result,
    });
    return result;
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
    const dataPayload = this._stringifyData(data);
    logger.info("FCM sendToUsers invoked", {
      targetUserCount: userIds.length,
      targetUserIds: userIds,
      title: title.slice(0, 120),
      bodyPreview: body.slice(0, 160),
      dataKeys: Object.keys(dataPayload),
    });

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

    if (userIds.length === 0) {
      logger.info("FCM sendToUsers: no target user ids, skipping");
      return;
    }

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
      logger.info(
        "FCM send skipped: no active rows in push_tokens for target user(s) (register device via POST /notifications/push-token)",
        { userIds },
      );
      return;
    }

    const uniqueTokens = [
      ...new Set(rows.map((r) => r.token).filter(Boolean)),
    ];

    logger.info("FCM: resolved device tokens from DB", {
      rowCount: rows.length,
      uniqueTokenCount: uniqueTokens.length,
      userIdsInRows: [...new Set(rows.map((r) => r.user_id))],
    });

    const messaging = admin.messaging(app);

    const batchSize = 500;
    const batchTotal = Math.ceil(uniqueTokens.length / batchSize) || 0;
    let totalSuccess = 0;
    let totalFailure = 0;

    for (let i = 0; i < uniqueTokens.length; i += batchSize) {
      const batch = uniqueTokens.slice(i, i + batchSize);
      const batchIndex = Math.floor(i / batchSize) + 1;
      try {
        logger.info("FCM: sending push notification batch to Firebase", {
          batchIndex,
          batchTotal,
          batchSize: batch.length,
          notificationType: dataPayload.type ?? null,
          titlePreview: title.slice(0, 80),
        });
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

        totalSuccess += response.successCount;
        totalFailure += response.failureCount;

        logger.info("FCM: push notifications sent to Firebase (batch result)", {
          batchIndex,
          batchTotal,
          successCount: response.successCount,
          failureCount: response.failureCount,
          tokenBatchSize: batch.length,
          notificationType: dataPayload.type ?? null,
        });

        if (response.failureCount > 0) {
          response.responses.forEach((resp, idx) => {
            if (resp.success || !resp.error) return;
            const err = resp.error;
            const token = batch[idx];
            logger.warn("FCM send failed for token batch item", {
              batchIndex,
              indexInBatch: idx,
              code: err.code,
              message: err.message,
              token: token ? maskFcmToken(token) : undefined,
            });
            if (token && this._shouldDeactivateToken(err.code)) {
              void this._deactivateInvalidToken(token);
            }
          });
        }
      } catch (error) {
        logger.error("FCM sendEachForMulticast error", {
          batchIndex,
          batchTotal,
          error,
        });
      }
    }

    logger.info(`FCM: sendToUsers finished — push notifications dispatched (${totalSuccess} delivered, ${totalFailure} failed)`, {
      totalSuccess,
      totalFailure,
      deviceCount: uniqueTokens.length,
      batchCount: batchTotal,
      notificationType: dataPayload.type ?? null,
      targetUserIds: userIds,
      titlePreview: title.slice(0, 120),
    });
  }
}

const pushService = new PushService();
export default pushService;
