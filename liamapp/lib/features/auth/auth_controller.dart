import 'package:flutter/foundation.dart';

import '../../core/api_client.dart';
import '../../core/token_storage.dart';

class AuthController extends ChangeNotifier {
  AuthController({required ApiClient apiClient, required TokenStorage tokenStorage})
      : _apiClient = apiClient,
        _tokenStorage = tokenStorage;

  ApiClient _apiClient;
  TokenStorage _tokenStorage;

  void updateDependencies({required ApiClient apiClient, required TokenStorage tokenStorage}) {
    _apiClient = apiClient;
    _tokenStorage = tokenStorage;
  }

  bool _isInitialized = false;
  bool get isInitialized => _isInitialized;

  bool _isAuthenticated = false;
  bool get isAuthenticated => _isAuthenticated;

  Future<void> initialize() async {
    final access = await _tokenStorage.readAccessToken();
    _isAuthenticated = access != null && access.isNotEmpty;
    _isInitialized = true;
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      await _apiClient.dio.post('/auth/logout');
    } finally {
      await _tokenStorage.clear();
      _isAuthenticated = false;
      notifyListeners();
    }
  }

  Future<void> login({required String phoneNumber, required String password}) async {
    final resp = await _apiClient.dio.post(
      '/auth/login',
      data: {
        'phoneNumber': phoneNumber,
        'password': password,
      },
    );

    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : null) as dynamic;

    final access = root?['token'];
    final refresh = root?['refreshToken'];

    if (access is String && refresh is String) {
      await _tokenStorage.writeTokens(accessToken: access, refreshToken: refresh);
      _isAuthenticated = true;
      notifyListeners();
      return;
    }

    throw StateError('Invalid login response');
  }

  Future<void> register({
    required String firstName,
    required String lastName,
    required String email,
    required String phoneNumber,
    required String password,
    required String countryCode,
  }) async {
    await _apiClient.dio.post(
      '/auth/register',
      data: {
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        'phoneNumber': phoneNumber,
        'password': password,
        'countryCode': countryCode,
      },
    );
  }
}
