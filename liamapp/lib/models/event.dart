class Event {
  const Event({
    required this.eventId,
    required this.title,
    this.location,
    this.startTime,
    this.description,
  });

  final String eventId;
  final String title;
  final String? location;
  final DateTime? startTime;
  final String? description;

  factory Event.fromJson(dynamic json) {
    if (json is! Map) {
      return const Event(eventId: '', title: 'Event');
    }

    final eventId = (json['event_id'] ?? json['eventId'] ?? json['id'] ?? '').toString();
    final title = (json['title'] ?? 'Event').toString();
    final locationRaw = (json['location'] ?? '').toString();
    final location = locationRaw.isEmpty ? null : locationRaw;

    DateTime? startTime;
    final rawStart = json['start_time'] ?? json['startTime'] ?? json['date_time'] ?? json['dateTime'];
    if (rawStart != null) {
      startTime = DateTime.tryParse(rawStart.toString());
    }

    final descriptionRaw = (json['description'] ?? '').toString();

    return Event(
      eventId: eventId,
      title: title,
      location: location,
      startTime: startTime,
      description: descriptionRaw.isEmpty ? null : descriptionRaw,
    );
  }
}
