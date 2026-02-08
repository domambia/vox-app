#!/usr/bin/env bash
# Build Android release APK using Java 17 (required by Android Gradle Plugin).
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Load .env so EXPO_PUBLIC_* are set for the script and for prebuild
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Resolve Java 17
resolve_java17() {
  if [ -n "$JAVA_HOME" ]; then
    local v
    v=$("$JAVA_HOME/bin/java" -version 2>&1 | head -1)
    if [[ "$v" == *"17"* ]]; then
      echo "$JAVA_HOME"
      return
    fi
  fi
  if [ "$(uname)" = "Darwin" ]; then
    /usr/libexec/java_home -v 17 2>/dev/null || true
  fi
}

JAVA17=$(resolve_java17)
if [ -z "$JAVA17" ]; then
  echo "Java 17 is required for the Android build. Current JAVA_HOME: ${JAVA_HOME:-not set}"
  echo "Install with: brew install openjdk@17"
  echo "Then set: export JAVA_HOME=\$(/usr/libexec/java_home -v 17)"
  exit 1
fi

echo "Using Java 17 at: $JAVA17"
export JAVA_HOME="$JAVA17"

# For install on a physical device, set your machine's LAN IP so the app can reach the backend:
#   export EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:3000/api/v1
#   export EXPO_PUBLIC_WS_BASE_URL=http://YOUR_IP:3000
if [ -z "$EXPO_PUBLIC_API_BASE_URL" ]; then
  echo "Note: EXPO_PUBLIC_API_BASE_URL is not set. The built APK will use localhost (works on emulator only)."
  echo "      For a real device, set it to your machine IP, e.g.: export EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000/api/v1"
fi

echo "Running prebuild..."
npx expo prebuild --platform android --clean

echo "Building release APK..."
cd "$ROOT/android"
./gradlew assembleRelease

echo "APK: $ROOT/android/app/build/outputs/apk/release/app-release.apk"
