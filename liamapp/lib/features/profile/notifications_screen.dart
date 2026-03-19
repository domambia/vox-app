import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_localizations.dart';
import '../../core/socket_service.dart';
import 'notifications_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  static const routeName = '/profile/notifications';

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late final NotificationsService _service;
  late Future<List<dynamic>> _future;

  Timer? _pollTimer;
  StreamSubscription<Map<String, dynamic>>? _notificationSub;
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    _service = NotificationsService(Provider.of<ApiClient>(context, listen: false));
    _future = _service.listNotifications();

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        await _service.markAsRead();
      } catch (_) {
        // Ignore failures; list may still load fine.
      }
      if (!mounted) return;
      _refresh();
    });

    _pollTimer = Timer.periodic(const Duration(seconds: 60), (_) {
      if (!mounted) return;
      _refresh();
    });

    // Real-time updates (websocket).
    final socket = Provider.of<SocketService>(context, listen: false);
    _notificationSub = socket.onNotificationNew.listen((_) {
      if (!mounted) return;
      _service
          .markAsRead()
          .catchError((_) {})
          .whenComplete(() => _refresh());
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _notificationSub?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    if (_isRefreshing) return;
    _isRefreshing = true;
    setState(() {
      _future = _service.listNotifications();
    });
    try {
      await _future;
    } finally {
      _isRefreshing = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.notifications)),
      body: SafeArea(
        child: FutureBuilder<List<dynamic>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        l10n.phrase('Failed to load notifications'),
                        style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 12),
                      FilledButton(onPressed: _refresh, child: Text(l10n.retry)),
                    ],
                  ),
                ),
              );
            }

            final items = snapshot.data ?? const [];
            if (items.isEmpty) {
              return Center(
                child: Text(
                  l10n.phrase('No notifications'),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              );
            }

            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: items.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final n = items[index] as dynamic;
                  final title = (n?['title'] ?? '').toString();
                  final message = (n?['message'] ?? '').toString();
                  final type = (n?['type'] ?? 'system').toString();

                  return ListTile(
                    leading: const Icon(Icons.notifications),
                    title: Text(title.isEmpty ? type : title),
                    subtitle: message.isEmpty ? null : Text(message),
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}
