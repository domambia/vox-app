# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Building for Android (faster, no EAS queue)

To avoid waiting in the EAS free-tier queue, build on your machine:

### Option 1: EAS local build (same as cloud, runs locally)

**Prerequisites:** Node.js, Java JDK 17+, [Android SDK and NDK](https://developer.android.com/studio) (e.g. via Android Studio).

```bash
# Preview APK (internal)
npm run build:android:local

# Production APK
npm run build:android:prod:local
```

Log in first if needed: `eas login`. The APK is written to the project directory.

### Option 2: Fully local (prebuild + Gradle, no EAS)

No EAS account needed. You need Android Studio / Android SDK and JDK.

```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew :app:assembleRelease
```

The unsigned APK is at `android/app/build/outputs/apk/release/app-release-unsigned.apk`. For a signed release build, configure signing in `android/` or use Option 1 with EAS credentials.

### Running on a physical Android device

The app works on the **emulator** with the default `localhost` API URL because the emulator rewrites it to your host machine. On a **physical device**, `localhost` is the phone itself, so the app cannot reach your backend.

**Fix:** Set your machine’s LAN IP when building so the device can reach your dev server:

```bash
# Replace 192.168.1.100 with your machine's IP (same Wi‑Fi as the phone)
export EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000/api/v1
export EXPO_PUBLIC_WS_BASE_URL=http://192.168.1.100:3000
./scripts/build-android.sh
```

Or with EAS local build: pass the same env vars before `npm run build:android:local`. For production, point these to your deployed API (HTTPS).

---

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
