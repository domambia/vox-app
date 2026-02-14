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
    await _tokenStorage.clear();
    _isAuthenticated = false;
    notifyListeners();
  }

  Future<void> sendOtp({required String phoneNumber, required String purpose}) async {
    final resp = await _apiClient.dio.post(
      '/auth/send-otp',
      data: {
        'phoneNumber': phoneNumber,
        'phone_number': phoneNumber,
        'purpose': purpose,
        'devBypassOtp': true,
      },
    );

    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : null) as dynamic;

    final access = root?['token'] ?? root?['tokens']?['token'] ?? root?['tokens']?['access_token'] ?? root?['tokens']?['accessToken'];
    final refresh = root?['refreshToken'] ?? root?['refresh_token'] ?? root?['tokens']?['refresh_token'] ?? root?['tokens']?['refreshToken'];

    if (access is String && refresh is String) {
      await _tokenStorage.writeTokens(accessToken: access, refreshToken: refresh);
      _isAuthenticated = true;
      notifyListeners();
    }
  }

  Future<void> verifyOtp({required String phoneNumber, required String otpCode, required String purpose}) async {
    final resp = await _apiClient.dio.post(
      '/auth/verify-otp',
      data: {
        'phoneNumber': phoneNumber,
        'otpCode': otpCode,
        'phone_number': phoneNumber,
        'otp_code': otpCode,
        'purpose': purpose,
      },
    );

    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : null) as dynamic;

    final access =
        root?['token'] ??
        root?['tokens']?['token'] ??
        root?['tokens']?['access_token'] ??
        root?['tokens']?['accessToken'];

    final refresh =
        root?['refreshToken'] ??
        root?['refresh_token'] ??
        root?['tokens']?['refresh_token'] ??
        root?['tokens']?['refreshToken'];

    if (access is String && refresh is String) {
      await _tokenStorage.writeTokens(accessToken: access, refreshToken: refresh);
      _isAuthenticated = true;
      notifyListeners();
      return;
    }

    throw StateError('Invalid verify OTP response');
  }
}
