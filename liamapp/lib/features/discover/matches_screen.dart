import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../chats/chats_service.dart';
import 'discover_service.dart';

class MatchesScreen extends StatefulWidget {
  const MatchesScreen({super.key});

  static const routeName = '/discover/matches';

  @override
  State<MatchesScreen> createState() => _MatchesScreenState();
}

class _MatchesScreenState extends State<MatchesScreen> {
  late final DiscoverService _service;
  late Future<List<dynamic>> _future;

  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _service = DiscoverService(Provider.of<ApiClient>(context, listen: false));
    _future = _service.matches();

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
      _future = _service.matches();
    });
    await _future;
  }

  String _name(dynamic m) {
    final user = m?['other_user'] ?? m?['user'] ?? m?['profile']?['user'];
    final first = (user?['first_name'] ?? user?['firstName'] ?? '').toString();
    final last = (user?['last_name'] ?? user?['lastName'] ?? '').toString();
    final name = ('$first $last').trim();
    return name.isEmpty ? 'User' : name;
  }

  String _userId(dynamic m) {
    final user = m?['other_user'] ?? m?['user'] ?? m?['profile']?['user'];
    return (user?['user_id'] ?? user?['userId'] ?? m?['user_id'] ?? m?['userId'] ?? '').toString();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Matches')),
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
                        'Failed to load matches',
                        style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 12),
                      FilledButton(onPressed: _refresh, child: const Text('Retry')),
                    ],
                  ),
                ),
              );
            }

            final items = snapshot.data ?? const [];
            if (items.isEmpty) {
              return Center(
                child: Text(
                  'No matches yet',
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
                  final m = items[index];
                  final name = _name(m);
                  final userId = _userId(m);

                  return ListTile(
                    leading: CircleAvatar(child: Text(name[0].toUpperCase())),
                    title: Text(name),
                    trailing: const Icon(Icons.chat),
                    onTap: userId.isEmpty
                        ? null
                        : () async {
                            // Start chat by sending a greeting (creates conversation)
                            final chats = ChatsService(Provider.of<ApiClient>(context, listen: false));
                            final sent = await chats.sendMessage(recipientId: userId, content: 'Hi');
                            final conversationId = (sent['conversation_id'] ?? sent['conversationId'] ?? sent['conversation']?['conversation_id'] ?? '').toString();
                            if (!context.mounted) return;
                            Navigator.of(context).pushNamed(
                              '/chats/chat',
                              arguments: {
                                'conversationId': conversationId,
                                'participantName': name,
                                'participantId': userId,
                              },
                            );
                          },
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
