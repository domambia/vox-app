import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';

import '../firebase_options.dart';
import 'api_client.dart';
import 'push_notification_router.dart';

/// Same init as [NotificationService.initialize] / pushnoti_firebase pattern:
/// explicit [FirebaseOptions] on Android from `firebase_options.dart`.
Future<void> _ensureFirebaseInitialized() async {
  if (Firebase.apps.isNotEmpty) return;
  final opts = DefaultFirebaseOptions.forCurrentPlatform;
  if (opts != null) {
    await Firebase.initializeApp(options: opts);
  } else {
    await Firebase.initializeApp();
  }
}

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await _ensureFirebaseInitialized();
}

void _dispatchFromRemoteMessage(RemoteMessage message) {
  final m = <String, String>{};
  message.data.forEach((k, v) {
    m[k] = v?.toString() ?? '';
  });
  if (m.isEmpty) return;
  PushNotificationRouter.notify(m);
}

void _dispatchFromPayload(String? payload) {
  if (payload == null || payload.isEmpty) return;
  try {
    final decoded = jsonDecode(payload);
    if (decoded is! Map) return;
    final m = <String, String>{};
    for (final e in decoded.entries) {
      m[e.key.toString()] = e.value?.toString() ?? '';
    }
    if (m.isEmpty) return;
    PushNotificationRouter.notify(m);
  } catch (_) {
    // ignore malformed payload
  }
}

/// Handles FCM + local notifications. The backend sends [RemoteMessage.data] with
/// string values, including `type`, for routing:
/// - `message` — DM; may include `conversationId`, `messageId`
/// - `group_message` — group chat; `groupId`, `messageId`
/// - `group_created` — creator; `groupId`
/// - `group_member_added` — added user; `groupId`
/// - `post_published` — author; `postId`
class NotificationService {
  NotificationService._();

  static final NotificationService instance = NotificationService._();

  final FlutterLocalNotificationsPlugin _local = FlutterLocalNotificationsPlugin();
  bool _initialized = false;
  String? _currentToken;
  ApiClient? _apiClientForTokenSync;
  StreamSubscription<String>? _tokenRefreshSub;

  static const AndroidNotificationChannel _defaultChannel = AndroidNotificationChannel(
    'liamapp_messages',
    'Messages & Notifications',
    description: 'Message and app notifications',
    importance: Importance.max,
  );

  /// Requests notification permission when missing: Android 13+ (`POST_NOTIFICATIONS`)
  /// via [Permission.notification], iOS via FCM. Safe to call again after login.
  Future<void> ensureNotificationPermission() async {
    if (kIsWeb) return;
    if (!Platform.isAndroid && !Platform.isIOS) return;

    if (Platform.isAndroid) {
      var status = await Permission.notification.status;
      if (status.isGranted) return;
      status = await Permission.notification.request();
      if (!status.isGranted && !status.isPermanentlyDenied) {
        await Permission.notification.request();
      }
      return;
    }

    // iOS — align FCM / APNs authorization
    final before = await FirebaseMessaging.instance.getNotificationSettings();
    if (before.authorizationStatus == AuthorizationStatus.authorized ||
        before.authorizationStatus == AuthorizationStatus.provisional) {
      return;
    }
    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );
  }

  Future<void> initialize() async {
    if (_initialized) return;

    await _ensureFirebaseInitialized();
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings();
    const initSettings = InitializationSettings(
      android: androidInit,
      iOS: iosInit,
    );
    await _local.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (response) {
        _dispatchFromPayload(response.payload);
      },
    );

    await _local
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_defaultChannel);

    final messaging = FirebaseMessaging.instance;
    await ensureNotificationPermission();

    await messaging.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    FirebaseMessaging.onMessage.listen((message) async {
      await _showFromRemoteMessage(message);
    });

    FirebaseMessaging.onMessageOpenedApp.listen(_dispatchFromRemoteMessage);

    final initialFcm = await messaging.getInitialMessage();
    if (initialFcm != null) {
      debugPrint('[NotificationService] open from terminated (FCM): ${initialFcm.data}');
      _dispatchFromRemoteMessage(initialFcm);
    } else {
      final launchDetails = await _local.getNotificationAppLaunchDetails();
      if (launchDetails?.didNotificationLaunchApp == true) {
        _dispatchFromPayload(launchDetails?.notificationResponse?.payload);
      }
    }

    final token = await messaging.getToken();
    _currentToken = token;
    if (token != null && token.isNotEmpty) {
      debugPrint('[NotificationService] FCM token: $token');
    }

    _tokenRefreshSub?.cancel();
    _tokenRefreshSub = messaging.onTokenRefresh.listen((token) async {
      _currentToken = token;
      debugPrint('[NotificationService] FCM token refreshed: $token');
      final client = _apiClientForTokenSync;
      if (client != null) {
        await syncTokenWithBackend(client);
      }
    });

    _initialized = true;
  }

  /// Call when the user logs in so refreshed tokens are registered; call [detachTokenSync] on logout.
  void attachTokenSync(ApiClient apiClient) {
    _apiClientForTokenSync = apiClient;
  }

  void detachTokenSync() {
    _apiClientForTokenSync = null;
  }

  Future<void> _showFromRemoteMessage(RemoteMessage message) async {
    final notification = message.notification;
    final title = notification?.title ?? 'Notification';
    final body = notification?.body ?? '';
    final payload = jsonEncode(message.data);

    await _local.show(
      message.hashCode,
      title,
      body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _defaultChannel.id,
          _defaultChannel.name,
          channelDescription: _defaultChannel.description,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(),
      ),
      payload: payload,
    );
  }

  Future<void> syncTokenWithBackend(ApiClient apiClient) async {
    final token = _currentToken ?? await FirebaseMessaging.instance.getToken();
    if (token == null || token.isEmpty) return;
    _currentToken = token;

    String platform = 'unknown';
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        platform = 'android';
        break;
      case TargetPlatform.iOS:
        platform = 'ios';
        break;
      case TargetPlatform.macOS:
        platform = 'macos';
        break;
      case TargetPlatform.windows:
        platform = 'windows';
        break;
      case TargetPlatform.linux:
        platform = 'linux';
        break;
      case TargetPlatform.fuchsia:
        platform = 'fuchsia';
        break;
    }

    const maxAttempts = 4;
    for (var attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await apiClient.dio.post(
          '/notifications/push-token',
          data: {
            'token': token,
            'platform': platform,
          },
        );
        debugPrint('[NotificationService] Push token synced');
        return;
      } catch (e) {
        debugPrint('[NotificationService] Push token sync failed (attempt $attempt/$maxAttempts): $e');
        if (attempt < maxAttempts) {
          await Future<void>.delayed(Duration(milliseconds: 400 * attempt));
        }
      }
    }
  }
}
