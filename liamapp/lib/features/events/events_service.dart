import '../../core/api_client.dart';
import '../../core/api_parsing.dart';
import '../../core/pagination.dart';
import '../../models/event.dart';

class EventsService {
  EventsService(this._apiClient);

  final ApiClient _apiClient;

  Future<Paginated<Event>> listEventsTyped({int page = 1, int limit = 20, String? status}) async {
    final query = <String, dynamic>{
      'limit': limit,
      'offset': (page - 1) * limit,
      'page': page,
    };
    final s = status?.trim().toLowerCase();
    if (s == 'upcoming') query['upcomingOnly'] = true;

    final resp = await _apiClient.dio.get('/events', queryParameters: query);
    final items = unwrapList(resp.data, keys: const ['items', 'events']);
    final paginationJson = unwrapPagination(resp.data);

    return Paginated(
      items: items.map(Event.fromJson).toList(growable: false),
      pagination: paginationJson == null ? null : Pagination.fromJson(paginationJson, fallbackPage: page, fallbackLimit: limit),
    );
  }

  Future<Event> getEventTyped(String eventId) async {
    final resp = await _apiClient.dio.get('/events/$eventId');
    final root = unwrapData(resp.data);
    return Event.fromJson(root);
  }

  Future<Map<String, dynamic>> listEvents({int page = 1, int limit = 20, String? status}) async {
    final query = <String, dynamic>{
      'limit': limit,
      'offset': (page - 1) * limit,
      'page': page,
    };
    final s = status?.trim().toLowerCase();
    if (s == 'upcoming') query['upcomingOnly'] = true;

    final resp = await _apiClient.dio.get('/events', queryParameters: query);
    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;

    return {
      'items': (root['items'] ?? root['events'] ?? root['data'] ?? []) as dynamic,
      'pagination': root['pagination'] as dynamic,
    };
  }

  Future<Map<String, dynamic>> createEvent({
    required String title,
    required DateTime startTime,
    String? location,
    String? description,
    String? groupId,
    String? accessibilityNotes,
  }) async {
    final resp = await _apiClient.dio.post(
      '/events',
      data: {
        'title': title,
        'dateTime': startTime.toUtc().toIso8601String(),
        'location': (location ?? '').trim().isEmpty ? 'TBD' : location!.trim(),
        if (description != null) 'description': description,
        if (groupId != null && groupId.trim().isNotEmpty) 'groupId': groupId.trim(),
        if (accessibilityNotes != null && accessibilityNotes.trim().isNotEmpty) 'accessibilityNotes': accessibilityNotes.trim(),
      },
    );

    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return (root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{});
  }

  Future<Map<String, dynamic>> getEvent(String eventId) async {
    final resp = await _apiClient.dio.get('/events/$eventId');
    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return (root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{});
  }

  Future<void> rsvp({required String eventId, required String status}) async {
    await _apiClient.dio.post(
      '/events/$eventId/rsvp',
      data: {
        'status': status.toUpperCase(),
      },
    );
  }

  Future<Map<String, dynamic>> updateEvent({
    required String eventId,
    String? title,
    DateTime? startTime,
    String? location,
    String? description,
    String? accessibilityNotes,
  }) async {
    final resp = await _apiClient.dio.put(
      '/events/$eventId',
      data: {
        if (title != null) 'title': title,
        if (description != null) 'description': description,
        if (startTime != null) 'dateTime': startTime.toUtc().toIso8601String(),
        if (location != null) 'location': location,
        if (accessibilityNotes != null) 'accessibilityNotes': accessibilityNotes,
      },
    );

    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return (root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{});
  }

  Future<void> deleteEvent(String eventId) async {
    await _apiClient.dio.delete('/events/$eventId');
  }
}
