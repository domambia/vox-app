import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  TokenStorage({FlutterSecureStorage? secureStorage})
      : _secureStorage = secureStorage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _secureStorage;

  static const _kAccessToken = 'access_token';
  static const _kRefreshToken = 'refresh_token';

  Future<String?> readAccessToken() => _secureStorage.read(key: _kAccessToken);

  Future<String?> readRefreshToken() =>
      _secureStorage.read(key: _kRefreshToken);

  Future<void> writeTokens({required String accessToken, required String refreshToken}) async {
    await _secureStorage.write(key: _kAccessToken, value: accessToken);
    await _secureStorage.write(key: _kRefreshToken, value: refreshToken);
  }

  Future<void> clear() async {
    await _secureStorage.delete(key: _kAccessToken);
    await _secureStorage.delete(key: _kRefreshToken);
  }
}
