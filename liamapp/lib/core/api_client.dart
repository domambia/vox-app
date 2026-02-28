import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'config.dart';
import 'token_storage.dart';

class ApiClient {
  ApiClient({required TokenStorage tokenStorage, Dio? dio})
      : _tokenStorage = tokenStorage,
        _dio = dio ?? Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl)) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: _onRequest,
        onError: _onError,
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          _logRequest(options);
          handler.next(options);
        },
        onResponse: (response, handler) {
          _logResponse(response);
          handler.next(response);
        },
        onError: (err, handler) {
          _logError(err);
          handler.next(err);
        },
      ),
    );
  }

  final TokenStorage _tokenStorage;
  final Dio _dio;

  final StreamController<void> _authExpiredController = StreamController<void>.broadcast();

  Stream<void> get onAuthExpired => _authExpiredController.stream;

  Dio get dio => _dio;

  Future<String?> readAccessToken() => _tokenStorage.readAccessToken();

  void _logRequest(RequestOptions options) {
    final method = options.method;
    final uri = options.uri;
    final qp = options.queryParameters;
    final hasBody = options.data != null;

    final headers = Map<String, dynamic>.from(options.headers);
    if (headers.containsKey('Authorization')) headers['Authorization'] = 'Bearer ***';

    debugPrint('[ApiClient] --> $method $uri');
    if (qp.isNotEmpty) debugPrint('[ApiClient] query: $qp');
    if (headers.isNotEmpty) debugPrint('[ApiClient] headers: $headers');
    if (hasBody) debugPrint('[ApiClient] body: ${options.data}');
  }

  void _logResponse(Response<dynamic> response) {
    final uri = response.requestOptions.uri;
    debugPrint('[ApiClient] <-- ${response.statusCode} $uri');
  }

  void _logError(DioException err) {
    final uri = err.requestOptions.uri;
    debugPrint('[ApiClient] <-- ERROR $uri');
    debugPrint('[ApiClient] type: ${err.type}');
    if (err.response != null) {
      debugPrint('[ApiClient] status: ${err.response?.statusCode}');
      debugPrint('[ApiClient] data: ${err.response?.data}');
    }
    debugPrint('[ApiClient] message: ${err.message}');
    if (err.error != null) debugPrint('[ApiClient] error: ${err.error}');
  }

  bool _isRefreshing = false;
  final List<Completer<void>> _refreshWaiters = [];

  Future<void> _onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final accessToken = await _tokenStorage.readAccessToken();
    if (accessToken != null && accessToken.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $accessToken';
    }
    handler.next(options);
  }

  Future<void> _onError(DioException err, ErrorInterceptorHandler handler) async {
    final statusCode = err.response?.statusCode;
    final requestOptions = err.requestOptions;

    final path = requestOptions.path;
    final isAuthEndpoint = path.contains('/auth/login') ||
        path.contains('/auth/register') ||
        path.contains('/auth/refresh') ||
        path.contains('/auth/logout');

    final isUnauthorized = statusCode == 401;
    final hasNotRetried = requestOptions.extra['retried'] != true;

    if (!isUnauthorized || !hasNotRetried || isAuthEndpoint) {
      handler.next(err);
      return;
    }

    final refreshToken = await _tokenStorage.readRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      _authExpiredController.add(null);
      handler.next(err);
      return;
    }

    try {
      await _refreshTokens();
      requestOptions.extra['retried'] = true;
      final response = await _dio.fetch(requestOptions);
      handler.resolve(response);
    } catch (_) {
      _authExpiredController.add(null);
      handler.next(err);
    }
  }

  Future<void> _refreshTokens() async {
    if (_isRefreshing) {
      final waiter = Completer<void>();
      _refreshWaiters.add(waiter);
      return waiter.future;
    }

    _isRefreshing = true;
    try {
      final refreshToken = await _tokenStorage.readRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) {
        throw StateError('Missing refresh token');
      }

      final refreshDio = Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl));
      final resp = await refreshDio.post(
        '/auth/refresh',
        options: Options(
          headers: {
            'Authorization': 'Bearer $refreshToken',
          },
        ),
      );

      final data = resp.data;
      final tokens = (data is Map ? (data['data'] ?? data) : null) as dynamic;
      final access = tokens?['token'] ??
          tokens?['accessToken'] ??
          tokens?['tokens']?['token'] ??
          tokens?['tokens']?['access_token'];
      final refresh = tokens?['refreshToken'] ??
          tokens?['refresh_token'] ??
          tokens?['tokens']?['refresh_token'] ??
          tokens?['tokens']?['refreshToken'];

      if (access is! String) {
        throw StateError('Invalid refresh response');
      }

      final nextRefresh = (refresh is String && refresh.isNotEmpty) ? refresh : refreshToken;
      await _tokenStorage.writeTokens(accessToken: access, refreshToken: nextRefresh);
    } catch (e) {
      await _tokenStorage.clear();
      rethrow;
    } finally {
      _isRefreshing = false;
      for (final w in _refreshWaiters) {
        if (!w.isCompleted) w.complete();
      }
      _refreshWaiters.clear();
    }
  }
}
