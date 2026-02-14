class Pagination {
  const Pagination({
    required this.page,
    required this.limit,
    this.total,
    this.hasNext,
  });

  final int page;
  final int limit;
  final int? total;
  final bool? hasNext;

  factory Pagination.fromJson(dynamic json, {int fallbackPage = 1, int fallbackLimit = 20}) {
    if (json is! Map) {
      return Pagination(page: fallbackPage, limit: fallbackLimit);
    }

    int asInt(dynamic v, int fallback) {
      if (v is int) return v;
      if (v is num) return v.toInt();
      return int.tryParse(v?.toString() ?? '') ?? fallback;
    }

    final page = asInt(json['page'] ?? json['currentPage'], fallbackPage);
    final limit = asInt(json['limit'] ?? json['pageSize'], fallbackLimit);
    final totalRaw = json['total'] ?? json['totalItems'];
    final total = totalRaw == null ? null : asInt(totalRaw, 0);
    final hasNext = (json['hasNext'] ?? json['has_next']);

    return Pagination(
      page: page,
      limit: limit,
      total: total,
      hasNext: hasNext is bool ? hasNext : null,
    );
  }
}

class Paginated<T> {
  const Paginated({required this.items, this.pagination});

  final List<T> items;
  final Pagination? pagination;
}
