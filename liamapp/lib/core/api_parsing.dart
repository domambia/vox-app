Map<String, dynamic> unwrapData(dynamic responseData) {
  if (responseData is Map) {
    final d = responseData['data'];
    if (d is Map<String, dynamic>) return d;
    if (d is Map) return Map<String, dynamic>.from(d);
    return Map<String, dynamic>.from(responseData);
  }
  return <String, dynamic>{};
}

List<dynamic> unwrapList(dynamic responseData, {List<String> keys = const ['items']}) {
  if (responseData is Map) {
    final root = unwrapData(responseData);
    for (final k in keys) {
      final v = root[k];
      if (v is List) return v;
    }
    final d = root['data'];
    if (d is List) return d;
  }
  return <dynamic>[];
}

Map<String, dynamic>? unwrapPagination(dynamic responseData) {
  if (responseData is Map) {
    final root = unwrapData(responseData);
    final p = root['pagination'];
    if (p is Map<String, dynamic>) return p;
    if (p is Map) return Map<String, dynamic>.from(p);
  }
  return null;
}
