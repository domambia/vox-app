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
}
