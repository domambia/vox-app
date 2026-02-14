import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  static String get apiBaseUrl {
    if (!dotenv.isInitialized) return 'http://10.0.2.2:4000/api/v1';
    final v = dotenv.env['API_BASE_URL']?.trim();
    return (v != null && v.isNotEmpty) ? v : 'http://10.0.2.2:4000/api/v1';
  }

  static String get socketBaseUrl {
    if (!dotenv.isInitialized) return 'http://10.0.2.2:4000';
    final v = dotenv.env['SOCKET_BASE_URL']?.trim();
    return (v != null && v.isNotEmpty) ? v : 'http://10.0.2.2:4000';
  }
}
