import 'package:dio/dio.dart';

import '../../core/api_client.dart';
import '../../core/api_parsing.dart';

class KycService {
  KycService(this._apiClient);

  final ApiClient _apiClient;

  Future<Map<String, dynamic>> status() async {
    final resp = await _apiClient.dio.get('/kyc/status');
    return unwrapData(resp.data);
  }

  Future<List<dynamic>> history() async {
    final resp = await _apiClient.dio.get('/kyc/history');
    final root = unwrapData(resp.data);
    final items = (root['verifications'] ?? root['items'] ?? []) as dynamic;
    return items is List ? items : <dynamic>[];
  }

  Future<Map<String, dynamic>> initiate({required String documentType, String? country}) async {
    final resp = await _apiClient.dio.post(
      '/kyc/initiate',
      data: {
        'document_type': documentType,
        if (country != null && country.trim().isNotEmpty) 'country': country.trim(),
      },
    );
    return unwrapData(resp.data);
  }

  Future<Map<String, dynamic>> uploadDocument({required String filePath}) async {
    final formData = FormData.fromMap({
      'document': await MultipartFile.fromFile(filePath),
    });

    final resp = await _apiClient.dio.post(
      '/kyc/upload-document',
      data: formData,
      options: Options(
        contentType: 'multipart/form-data',
      ),
    );

    return unwrapData(resp.data);
  }

  Future<Map<String, dynamic>> scheduleCall({required DateTime scheduledAt, required String timezone}) async {
    final resp = await _apiClient.dio.post(
      '/kyc/schedule-call',
      data: {
        'scheduled_at': scheduledAt.toUtc().toIso8601String(),
        'timezone': timezone,
      },
    );

    return unwrapData(resp.data);
  }
}
