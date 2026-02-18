import '../../core/api_client.dart';
import 'package:dio/dio.dart';

class ProfileService {
  ProfileService(this._apiClient);

  final ApiClient _apiClient;

  Future<Map<String, dynamic>> getMyProfile() async {
    final resp = await _apiClient.dio.get('/profile/me');
    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return (root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{});
  }

  Future<Map<String, dynamic>> getProfile({required String userId}) async {
    final resp = await _apiClient.dio.get('/profile/$userId');
    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return (root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{});
  }

  Future<Map<String, dynamic>> createProfile({
    String? bio,
    String? location,
    List<String>? interests,
    String? lookingFor,
    String? voiceBioUrl,
  }) async {
    final resp = await _apiClient.dio.post(
      '/profile',
      data: {
        if (bio != null) 'bio': bio,
        if (location != null) 'location': location,
        if (interests != null) 'interests': interests,
        if (lookingFor != null) 'lookingFor': lookingFor,
        if (voiceBioUrl != null) 'voiceBioUrl': voiceBioUrl,
      },
    );
    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return (root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{});
  }

  Future<Map<String, dynamic>> updateProfile({
    required String userId,
    String? bio,
    String? location,
    List<String>? interests,
    String? lookingFor,
    String? voiceBioUrl,
  }) async {
    final resp = await _apiClient.dio.put(
      '/profile/$userId',
      data: {
        if (bio != null) 'bio': bio,
        if (location != null) 'location': location,
        if (interests != null) 'interests': interests,
        if (lookingFor != null) 'lookingFor': lookingFor,
        if (voiceBioUrl != null) 'voiceBioUrl': voiceBioUrl,
      },
    );
    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return (root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{});
  }

  Future<void> deleteProfile({required String userId}) async {
    await _apiClient.dio.delete('/profile/$userId');
  }

  Future<Map<String, dynamic>> uploadVoiceBio({required String filePath}) async {
    final form = FormData.fromMap({
      'voiceBio': await MultipartFile.fromFile(filePath, filename: filePath.split('/').last),
    });
    final resp = await _apiClient.dio.post('/profile/voice-bio', data: form);
    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return (root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{});
  }

  Future<void> deleteVoiceBio() async {
    await _apiClient.dio.delete('/profile/voice-bio');
  }
}
