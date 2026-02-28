import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import 'calls_service.dart';

class CallHistoryScreen extends StatefulWidget {
  const CallHistoryScreen({super.key});

  static const routeName = '/profile/calls';

  @override
  State<CallHistoryScreen> createState() => _CallHistoryScreenState();
}

class _CallHistoryScreenState extends State<CallHistoryScreen> {
  late final CallsService _service;
  late Future<Map<String, dynamic>> _future;

  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _service = CallsService(Provider.of<ApiClient>(context, listen: false));
    _future = _service.history();

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
      _future = _service.history();
    });
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Call history')),
      body: SafeArea(
        child: FutureBuilder<Map<String, dynamic>>(
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
                        'Failed to load call history',
                        style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 12),
                      FilledButton(onPressed: _refresh, child: const Text('Retry')),
                    ],
                  ),
                ),
              );
            }

            final raw = snapshot.data?['items'];
            final items = raw is List ? raw : const [];

            if (items.isEmpty) {
              return Center(
                child: Text(
                  'No calls yet',
                  style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
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
                  final c = items[index] as dynamic;
                  final status = (c?['status'] ?? '').toString();
                  final created = (c?['created_at'] ?? c?['createdAt'] ?? '').toString();
                  final callId = (c?['call_id'] ?? c?['callId'] ?? c?['id'] ?? '').toString();
                  final receiverId = (c?['receiver_id'] ?? c?['receiverId'] ?? '').toString();

                  return ListTile(
                    leading: const Icon(Icons.call),
                    title: Text(status.isEmpty ? 'Call' : status),
                    subtitle: Text(
                      [if (created.isNotEmpty) created, if (callId.isNotEmpty) callId, if (receiverId.isNotEmpty) receiverId].join(' • '),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
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
