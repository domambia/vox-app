import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/pagination.dart';
import '../../models/event.dart';
import 'create_event_screen.dart';
import 'events_service.dart';

class EventsListScreen extends StatefulWidget {
  const EventsListScreen({super.key});

  static const routeName = '/events';

  @override
  State<EventsListScreen> createState() => _EventsListScreenState();
}

class _EventsListScreenState extends State<EventsListScreen> {
  late final EventsService _service;
  late Future<Paginated<Event>> _future;

  Timer? _pollTimer;

  String _formatStartTime(BuildContext context, DateTime? startTime) {
    if (startTime == null) return '';
    final local = startTime.toLocal();
    final localizations = MaterialLocalizations.of(context);
    final time = localizations.formatTimeOfDay(
      TimeOfDay.fromDateTime(local),
      alwaysUse24HourFormat: MediaQuery.of(context).alwaysUse24HourFormat,
    );
    final date = localizations.formatFullDate(local);
    return '$date $time';
  }

  @override
  void initState() {
    super.initState();
    _service = EventsService(Provider.of<ApiClient>(context, listen: false));
    _future = _service.listEventsTyped();

    _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) return;
      _refresh();
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    setState(() {
      _future = _service.listEventsTyped();
    });
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Paginated<Event>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return _ErrorView(message: 'Failed to load events', onRetry: _refresh);
        }

        final items = snapshot.data?.items ?? const <Event>[];

        if (items.isEmpty) {
          return _EmptyEvents(onNewEvent: () {
            Navigator.of(context).pushNamed(CreateEventScreen.routeName).then((_) => _refresh());
          });
        }

        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: items.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final e = items[index];
              final eventId = e.eventId;
              final title = e.title;
              final location = e.location ?? '';
              final start = _formatStartTime(context, e.startTime);

              return ListTile(
                leading: const CircleAvatar(child: Icon(Icons.event)),
                title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
                subtitle: Text(
                  [if (start.isNotEmpty) start, if (location.isNotEmpty) location].join(' • '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                onTap: () async {
                  await Navigator.of(context).pushNamed(
                    '/events/detail',
                    arguments: {
                      'eventId': eventId,
                    },
                  );

                  if (!context.mounted) return;
                  await _refresh();
                },
              );
            },
          ),
        );
      },
    );
  }
}

class _EmptyEvents extends StatelessWidget {
  const _EmptyEvents({required this.onNewEvent});

  final VoidCallback onNewEvent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'No events yet',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              'Create an event to bring the community together.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: onNewEvent, child: const Text('New event')),
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              message,
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => onRetry(),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
