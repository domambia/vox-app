import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';

Future<void> requestStartupPermissions() async {
  if (kIsWeb) return;

  final permissions = <Permission>{
    // Notification permission is requested in [NotificationService.ensureNotificationPermission]
    Permission.camera,
    Permission.microphone,
    Permission.speech,
    if (Platform.isIOS || Platform.isAndroid) Permission.photos,
    if (Platform.isAndroid) Permission.storage,
  };

  for (final permission in permissions) {
    try {
      await permission.request();
    } catch (_) {
      // Ignore unsupported/unavailable permissions on this device.
    }
  }
}
