// Generated from android/app/google-services.json (project liamapp-c4895).
// For iOS: add GoogleService-Info.plist to Xcode, then run:
//   dart pub global activate flutterfire_cli && flutterfire configure
// ignore_for_file: lines_longer_than_80_chars, avoid_classes_with_only_static_members

import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Same pattern as pushnoti_firebase: explicit [FirebaseOptions] for Android.
/// Other platforms use [Firebase.initializeApp] without options when native
/// config files are present.
class DefaultFirebaseOptions {
  /// Android: always use bundled options. iOS/desktop: null → default native init.
  static FirebaseOptions? get forCurrentPlatform {
    if (kIsWeb) return null;
    if (defaultTargetPlatform == TargetPlatform.android) {
      return android;
    }
    return null;
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyAo8uujm-TFSysKxj6PhlC2eeuKLQeHe0w',
    appId: '1:1014213499996:android:a0929480ab809d85819a99',
    messagingSenderId: '1014213499996',
    projectId: 'liamapp-c4895',
    storageBucket: 'liamapp-c4895.firebasestorage.app',
  );
}
