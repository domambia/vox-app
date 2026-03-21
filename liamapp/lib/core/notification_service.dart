import 'dart:async';
import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../firebase_options.dart';
import 'api_client.dart';
import 'push_notification_router.dart';

bool get _fcmEnabled => !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

/// FCM / Firebase init — Android only.
Future<void> _ensureFirebaseInitialized() async {
  if (!_fcmEnabled) return;
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
  if (!_fcmEnabled) return;
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
  VoidCallback? _foregroundFeedback;

  static const AndroidNotificationChannel _defaultChannel = AndroidNotificationChannel(
    'liamapp_messages',
    'Messages & Notifications',
    description: 'Message and app notifications',
    importance: Importance.max,
  );

  /// Android 13+ notification permission and iOS alert permission when FCM is enabled.
  /// Uses [FirebaseMessaging.requestPermission] (recommended for FCM) after Firebase init.
  Future<void> ensureNotificationPermission() async {
    if (kIsWeb) return;
    if (!_fcmEnabled) return;
    await _ensureFirebaseInitialized();
    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
  }

  Future<void> initialize() async {
    if (_initialized) return;

    if (!_fcmEnabled) {
      _initialized = true;
      return;
    }

    // Must register before Firebase.initializeApp — see FlutterFire messaging docs.
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    await _ensureFirebaseInitialized();

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

    // Foreground: we show a WhatsApp-style in-app banner; avoid iOS system banner + local duplicate.
    await messaging.setForegroundNotificationPresentationOptions(
      alert: false,
      badge: true,
      sound: false,
    );

    FirebaseMessaging.onMessage.listen(_onForegroundMessage);

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

  /// Set from [MyApp] so foreground pushes can play sound/haptic per [SettingsController].
  void setForegroundFeedback(VoidCallback? callback) {
    _foregroundFeedback = callback;
  }

  /// While the app is in the **foreground**, Android does not show FCM "notification"
  /// payloads in the status bar. Post a high-importance local notification so the push
  /// is visible like a normal message; tap handling still goes through [_local] → payload.
  Future<void> _showForegroundSystemNotification(
    RemoteMessage message,
    (String, String, Map<String, String>) parts,
  ) async {
    final payloadMap = Map<String, String>.from(parts.$3);
    if (payloadMap.isEmpty) {
      message.data.forEach((k, v) {
        payloadMap[k] = v?.toString() ?? '';
      });
    }
    final payload =
        payloadMap.isEmpty ? null : jsonEncode(payloadMap);

    final androidDetails = AndroidNotificationDetails(
      _defaultChannel.id,
      _defaultChannel.name,
      channelDescription: _defaultChannel.description,
      importance: Importance.max,
      priority: Priority.high,
    );
    const iosDetails = DarwinNotificationDetails();
    final details = NotificationDetails(android: androidDetails, iOS: iosDetails);

    final id = DateTime.now().millisecondsSinceEpoch.remainder(2147483647);
    await _local.show(
      id,
      parts.$1,
      parts.$2,
      details,
      payload: payload,
    );
  }

  void _onForegroundMessage(RemoteMessage message) {
    _foregroundFeedback?.call();
    final parts = _titleBodyAndDataFromMessage(message);
    // Tray + heads-up while app is open (see [_showForegroundSystemNotification] doc).
    unawaited(_showForegroundSystemNotification(message, parts));
  }

  /// Resolves title/body from FCM `notification` and/or `data` (data-only messages).
  (String, String, Map<String, String>) _titleBodyAndDataFromMessage(RemoteMessage message) {
    final m = <String, String>{};
    message.data.forEach((k, v) {
      m[k] = v?.toString() ?? '';
    });

    var title = message.notification?.title?.trim() ?? '';
    var body = message.notification?.body?.trim() ?? '';
    if (title.isEmpty) {
      title = m['title'] ?? '';
    }
    if (body.isEmpty) {
      body = m['message'] ?? m['body'] ?? '';
    }
    if (title.isEmpty) {
      title = 'Notification';
    }
    return (title, body, m);
  }

  Future<void> syncTokenWithBackend(ApiClient apiClient) async {
    if (!_fcmEnabled) return;
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
