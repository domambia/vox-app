import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  static String _normalizeApiBaseUrl(String raw) {
    var v = raw.trim();
    if (v.isEmpty) return v;

    while (v.contains('/api/v1/api/v1')) {
      v = v.replaceAll('/api/v1/api/v1', '/api/v1');
    }

    if (v.endsWith('/')) v = v.substring(0, v.length - 1);
    return v;
  }

  static String _normalizeSocketBaseUrl(String raw) {
    final v = raw.trim();
    if (v.isEmpty) return v;

    final uri = Uri.tryParse(v);
    if (uri == null || uri.scheme.isEmpty || uri.host.isEmpty) {
      return v;
    }

    final port = uri.hasPort ? uri.port : null;
    return Uri(
      scheme: uri.scheme,
      host: uri.host,
      port: port,
    ).toString();
  }

  static String get apiBaseUrl {
    if (!dotenv.isInitialized) return 'http://10.0.2.2:4000/api/v1';
    final v = dotenv.env['API_BASE_URL']?.trim();
    return (v != null && v.isNotEmpty)
        ? _normalizeApiBaseUrl(v)
        : 'http://10.0.2.2:4000/api/v1';
  }

  static String get socketBaseUrl {
    if (!dotenv.isInitialized) return 'http://10.0.2.2:4000';
    final v = dotenv.env['SOCKET_BASE_URL']?.trim();
    return (v != null && v.isNotEmpty)
        ? _normalizeSocketBaseUrl(v)
        : 'http://10.0.2.2:4000';
  }
}
