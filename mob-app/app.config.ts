import type { ExpoConfig, ConfigContext } from "expo/config";
import { withAndroidManifest } from "expo/config-plugins";

function withCleartextTraffic(config: ExpoConfig): ExpoConfig {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application?.[0];
    if (app) {
      app.$ = app.$ ?? {};
      app.$["android:usesCleartextTraffic"] = "true";
    }
    return config;
  });
}

export default ({ config }: ConfigContext): ExpoConfig => {
  if (!config.name) {
    throw new Error("Expo config is missing required field: name");
  }

  if (!config.slug) {
    throw new Error("Expo config is missing required field: slug");
  }

  const next: ExpoConfig = {
    ...config,
    name: config.name,
    slug: config.slug,
    android: {
      ...config.android,
    },
  };

  return withCleartextTraffic(next);
};
