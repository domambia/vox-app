/**
 * Environment configuration for the mobile app
 *
 * - Backend defaults to port 3000. Set EXPO_PUBLIC_API_BASE_URL to override.
 * - On Android emulator, "localhost" is automatically replaced with 10.0.2.2 (host machine).
 * - On physical device, set EXPO_PUBLIC_API_BASE_URL to your machine IP, e.g. http://192.168.1.100:3000/api/v1
 */
const rawApiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1";
const rawWsBase = process.env.EXPO_PUBLIC_WS_BASE_URL || "http://localhost:3000";

export const env = {
  API_BASE_URL: rawApiBase,
  WS_BASE_URL: rawWsBase,
  ENVIRONMENT: process.env.EXPO_PUBLIC_ENVIRONMENT || "development",
} as const;

/** For use in apiClient: resolves localhost to Android emulator host when needed */
export function getApiBaseUrl(): string {
  if (typeof __DEV__ === "undefined" || !__DEV__) return rawApiBase;
  if (!rawApiBase.includes("localhost")) return rawApiBase;
  try {
    const { Platform } = require("react-native");
    if (Platform.OS === "android") {
      return rawApiBase.replace(/localhost/g, "10.0.2.2");
    }
  } catch {
    // not in RN context
  }
  return rawApiBase;
}

/** For WebSocket: same localhost resolution as API */
export function getWsBaseUrl(): string {
  if (typeof __DEV__ === "undefined" || !__DEV__) return rawWsBase;
  if (!rawWsBase.includes("localhost")) return rawWsBase;
  try {
    const { Platform } = require("react-native");
    if (Platform.OS === "android") {
      return rawWsBase.replace(/localhost/g, "10.0.2.2");
    }
  } catch {
    // not in RN context
  }
  return rawWsBase;
}

export type Environment = typeof env;
