import '../../core/api_client.dart';

class DiscoverService {
  DiscoverService(this._apiClient);

  final ApiClient _apiClient;

  Future<List<dynamic>> discover({int offset = 0, int limit = 20}) async {
    final resp = await _apiClient.dio.get(
      '/profiles/discover',
      queryParameters: {
        'limit': limit,
        'offset': offset,
      },
    );
    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    final items = (root['items'] ?? root['profiles'] ?? []) as dynamic;
    return items is List ? items : <dynamic>[];
  }

  Future<List<dynamic>> matches() async {
    final resp = await _apiClient.dio.get(
      '/profiles/matches',
    );
    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    final items = (root['matches'] ?? root['items'] ?? []) as dynamic;
    return items is List ? items : <dynamic>[];
  }

  Future<List<dynamic>> likes({required String type}) async {
    final resp = await _apiClient.dio.get(
      '/profiles/likes',
      queryParameters: {
        'type': type,
      },
    );
    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    final items = (root['likes'] ?? root['items'] ?? []) as dynamic;
    return items is List ? items : <dynamic>[];
  }

  Future<Map<String, dynamic>> likeProfile(String userId) async {
    final resp = await _apiClient.dio.post('/profile/$userId/like');
    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return (root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{});
  }

  Future<void> unlikeProfile(String userId) async {
    await _apiClient.dio.delete('/profile/$userId/like');
  }
}
