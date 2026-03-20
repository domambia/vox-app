import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'api_client.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

class NotificationService {
  NotificationService._();

  static final NotificationService instance = NotificationService._();

  final FlutterLocalNotificationsPlugin _local = FlutterLocalNotificationsPlugin();
  bool _initialized = false;
  String? _currentToken;

  static const AndroidNotificationChannel _defaultChannel = AndroidNotificationChannel(
    'liamapp_messages',
    'Messages & Notifications',
    description: 'Message and app notifications',
    importance: Importance.high,
  );

  Future<void> initialize() async {
    if (_initialized) return;

    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings();
    const initSettings = InitializationSettings(
      android: androidInit,
      iOS: iosInit,
    );
    await _local.initialize(initSettings);

    await _local
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_defaultChannel);

    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    await messaging.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    FirebaseMessaging.onMessage.listen((message) async {
      await _showFromRemoteMessage(message);
    });

    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      debugPrint('[NotificationService] open from background: ${message.data}');
    });

    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) {
      debugPrint('[NotificationService] open from terminated: ${initial.data}');
    }

    final token = await messaging.getToken();
    _currentToken = token;
    if (token != null && token.isNotEmpty) {
      debugPrint('[NotificationService] FCM token: $token');
    }

    messaging.onTokenRefresh.listen((token) {
      _currentToken = token;
      debugPrint('[NotificationService] FCM token refreshed: $token');
    });

    _initialized = true;
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

    try {
      await apiClient.dio.post(
        '/notifications/push-token',
        data: {
          'token': token,
          'platform': platform,
        },
      );
      debugPrint('[NotificationService] Push token synced');
    } catch (e) {
      debugPrint('[NotificationService] Push token sync failed: $e');
    }
  }
}
