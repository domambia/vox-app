/**
 * Environment configuration for the mobile app
 *
 * - Backend defaults to port 3000. Set EXPO_PUBLIC_API_BASE_URL to override.
 * - On Android emulator (debug), "localhost" is replaced with 10.0.2.2 (host machine).
 * - IMPORTANT – Physical device / release build: __DEV__ is false, so "localhost" is NOT
 *   replaced. On a real device, localhost = the device itself, so API calls fail. You MUST
 *   set EXPO_PUBLIC_API_BASE_URL (and EXPO_PUBLIC_WS_BASE_URL) at build time, e.g.:
 *     EXPO_PUBLIC_API_BASE_URL=http://YOUR_MACHINE_IP:3000/api/v1 \
 *     EXPO_PUBLIC_WS_BASE_URL=http://YOUR_MACHINE_IP:3000 \
 *     ./scripts/build-android.sh
 *   Use your LAN IP (e.g. 192.168.1.100) so the phone can reach your dev server.
 */
const rawApiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1";
const rawWsBase = process.env.EXPO_PUBLIC_WS_BASE_URL || "http://localhost:3000";

export const env = {
  API_BASE_URL: rawApiBase,
  WS_BASE_URL: rawWsBase,
  ENVIRONMENT: process.env.EXPO_PUBLIC_ENVIRONMENT || "development",
} as const;

/** For use in apiClient: resolves localhost to Android emulator host when needed (debug only). */
export function getApiBaseUrl(): string {
  if (!rawApiBase.includes("localhost")) return rawApiBase;
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    try {
      const { Platform } = require("react-native");
      if (Platform.OS === "android") {
        return rawApiBase.replace(/localhost/g, "10.0.2.2");
      }
    } catch {
      // not in RN context
    }
  }
  return rawApiBase;
}

/** For WebSocket: same localhost resolution as API (debug only). */
export function getWsBaseUrl(): string {
  if (!rawWsBase.includes("localhost")) return rawWsBase;
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    try {
      const { Platform } = require("react-native");
      if (Platform.OS === "android") {
        return rawWsBase.replace(/localhost/g, "10.0.2.2");
      }
    } catch {
      // not in RN context
    }
  }
  return rawWsBase;
}

export type Environment = typeof env;
