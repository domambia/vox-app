/// Holds notification [data] until the app shell can navigate (cold start, or not logged in yet).
class PushNotificationRouter {
  PushNotificationRouter._();

  static Map<String, String>? _pending;
  static void Function(Map<String, String> data)? _handler;

  /// Called from [NotificationService] when the user opens a push (FCM or local).
  static void notify(Map<String, String> data) {
    if (data.isEmpty) return;
    final h = _handler;
    if (h != null) {
      h(Map<String, String>.from(data));
    } else {
      _pending = Map<String, String>.from(data);
    }
  }

  /// When the user was not authenticated, re-queue the same payload for after login.
  static void stashForLater(Map<String, String> data) {
    if (data.isEmpty) return;
    _pending = Map<String, String>.from(data);
  }

  static void register(void Function(Map<String, String> data) handler) {
    _handler = handler;
    final p = _pending;
    if (p != null) {
      _pending = null;
      handler(p);
    }
  }

  static void unregister() {
    _handler = null;
  }

  /// Call when auth becomes true while a handler is already registered (e.g. after login).
  static void retryPending() {
    final h = _handler;
    final p = _pending;
    if (h == null || p == null) return;
    _pending = null;
    h(p);
  }
}
