import '../../core/api_client.dart';

class NotificationsService {
  NotificationsService(this._apiClient);

  final ApiClient _apiClient;

  Future<List<dynamic>> listNotifications({int limit = 50}) async {
    final resp = await _apiClient.dio.get(
      '/notifications',
      queryParameters: {
        'limit': limit,
      },
    );

    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    final items = (root['items'] ?? root['notifications'] ?? []) as dynamic;
    return items is List ? items : <dynamic>[];
  }

  Future<int> getUnreadCount() async {
    final resp = await _apiClient.dio.get('/notifications/unread-count');
    final root = resp.data is Map ? (resp.data as Map)['data'] ?? resp.data : null;
    final dataMap = root is Map ? root : <String, dynamic>{};
    final v = dataMap['unread_count'];
    if (v is int) return v;
    if (v is num) return v.toInt();
    return 0;
  }

  Future<void> markAsRead({List<String>? notificationIds}) async {
    final payload = notificationIds != null ? {'notificationIds': notificationIds} : const <String, dynamic>{};
    await _apiClient.dio.post('/notifications/read', data: payload);
  }
}
