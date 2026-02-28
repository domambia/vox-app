import 'package:flutter/material.dart';
import 'package:dio/dio.dart';

/// Parses the backend error message from a [DioException].
/// Backend returns: { success: false, error: { code, message, details } }
String messageFromDioException(DioException e) {
  final data = e.response?.data;
  if (data is Map<String, dynamic>) {
    final error = data['error'];
    if (error is Map<String, dynamic>) {
      final msg = error['message'];
      if (msg is String && msg.isNotEmpty) return msg;
    }
  }
  final status = e.response?.statusCode;
  if (status == 401) return 'Invalid phone number, email or password';
  if (status != null && status >= 400 && status < 500) return 'Request failed. Please try again.';
  if (e.type == DioExceptionType.connectionTimeout ||
      e.type == DioExceptionType.sendTimeout ||
      e.type == DioExceptionType.receiveTimeout) {
    return 'Connection timed out. Check your network.';
  }
  if (e.type == DioExceptionType.connectionError) return 'No connection. Check your network.';
  return e.message ?? 'Something went wrong. Please try again.';
}

/// Shows a toast (SnackBar) with optional success/error styling.
void showToast(
  BuildContext context,
  String message, {
  bool isError = false,
  Duration duration = const Duration(seconds: 3),
}) {
  if (!context.mounted) return;
  final theme = Theme.of(context);
  final colorScheme = theme.colorScheme;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(
        message,
        style: TextStyle(
          color: isError ? colorScheme.onError : colorScheme.onInverseSurface,
        ),
      ),
      backgroundColor: isError ? colorScheme.error : colorScheme.inverseSurface,
      behavior: SnackBarBehavior.floating,
      duration: duration,
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 24),
    ),
  );
}
