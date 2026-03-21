// Generated from android/app/google-services.json (project liamapp-c4895).
// Push / FCM is Android-only in this app; iOS does not use [FirebaseOptions] here.
// ignore_for_file: lines_longer_than_80_chars, avoid_classes_with_only_static_members

import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Explicit [FirebaseOptions] for Android only ([NotificationService] skips FCM on iOS).
class DefaultFirebaseOptions {
  /// Android: bundled options. Non-Android: null (FCM not initialized).
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
