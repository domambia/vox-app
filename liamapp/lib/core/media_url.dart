import 'config.dart';

String resolveMediaUrl(String rawUrl) {
  final value = rawUrl.trim();
  if (value.isEmpty) return value;

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  final base = AppConfig.apiBaseUrl;
  final baseUri = Uri.tryParse(base);
  if (baseUri == null || baseUri.scheme.isEmpty || baseUri.host.isEmpty) {
    return value;
  }

  final origin = Uri(
    scheme: baseUri.scheme,
    host: baseUri.host,
    port: baseUri.hasPort ? baseUri.port : null,
  ).toString();

  if (value.startsWith('/')) return '$origin$value';
  if (value.startsWith('api/')) return '$origin/$value';
  if (value.startsWith('uploads/')) return '$origin/$value';

  return '$origin/$value';
}
