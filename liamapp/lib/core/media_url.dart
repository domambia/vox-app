import 'config.dart';

String resolveMediaUrl(String rawUrl) {
  final value = rawUrl.trim();
  if (value.isEmpty) return value;

  final base = AppConfig.apiBaseUrl;
  final baseUri = Uri.tryParse(base);
  if (baseUri == null || baseUri.scheme.isEmpty || baseUri.host.isEmpty) {
    return value;
  }

  final originUri = Uri(
    scheme: baseUri.scheme,
    host: baseUri.host,
    port: baseUri.hasPort ? baseUri.port : null,
  );
  final origin = originUri.toString();

  // Backend sometimes returns localhost/emulator absolute URLs that are invalid on real devices.
  if (value.startsWith('http://') || value.startsWith('https://')) {
    final remoteUri = Uri.tryParse(value);
    if (remoteUri == null) return value;

    final host = remoteUri.host.toLowerCase();
    const localHosts = {'localhost', '127.0.0.1', '10.0.2.2'};
    if (localHosts.contains(host)) {
      final rebased = originUri.replace(
        path: remoteUri.path,
        query: remoteUri.hasQuery ? remoteUri.query : null,
      );
      return rebased.toString();
    }
    return value;
  }

  if (value.startsWith('/')) return '$origin$value';
  if (value.startsWith('api/')) return '$origin/$value';
  if (value.startsWith('uploads/')) return '$origin/$value';

  return '$origin/$value';
}
