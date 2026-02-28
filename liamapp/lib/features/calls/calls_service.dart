import '../../core/api_client.dart';
import '../../core/api_parsing.dart';

class CallsService {
  CallsService(this._apiClient);

  final ApiClient _apiClient;

  Future<Map<String, dynamic>> initiate({required String receiverId}) async {
    final resp = await _apiClient.dio.post(
      '/calls/initiate',
      data: {
        'receiverId': receiverId,
      },
    );
    return unwrapData(resp.data);
  }

  Future<Map<String, dynamic>> getCall(String callId) async {
    final resp = await _apiClient.dio.get('/calls/$callId');
    return unwrapData(resp.data);
  }

  Future<Map<String, dynamic>> updateStatus({required String callId, required String status}) async {
    final resp = await _apiClient.dio.put(
      '/calls/$callId/status',
      data: {
        'status': status,
      },
    );
    return unwrapData(resp.data);
  }

  Future<Map<String, dynamic>> endCall({required String callId}) async {
    final resp = await _apiClient.dio.post('/calls/$callId/end');
    return unwrapData(resp.data);
  }

  Future<Map<String, dynamic>> history({int page = 1, int limit = 20, String? status}) async {
    final query = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (status != null && status.trim().isNotEmpty) query['status'] = status.trim();

    final resp = await _apiClient.dio.get('/calls/history', queryParameters: query);
    final root = unwrapData(resp.data);

    return {
      'items': (root['calls'] ?? root['items'] ?? []) as dynamic,
      'pagination': root['pagination'] as dynamic,
    };
  }

  Future<Map<String, dynamic>> webrtcConfig() async {
    final resp = await _apiClient.dio.get('/calls/webrtc-config');
    return unwrapData(resp.data);
  }

  Future<Map<String, dynamic>> room(String callId) async {
    final resp = await _apiClient.dio.get('/calls/$callId/room');
    return unwrapData(resp.data);
  }
}
