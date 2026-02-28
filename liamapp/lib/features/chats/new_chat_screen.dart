import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../discover/discover_service.dart';
import 'chats_service.dart';

class NewChatScreen extends StatefulWidget {
  const NewChatScreen({super.key});

  static const routeName = '/chats/new';

  @override
  State<NewChatScreen> createState() => _NewChatScreenState();
}

class _NewChatScreenState extends State<NewChatScreen> {
  late final ApiClient _apiClient;
  late final ChatsService _chats;
  late final DiscoverService _discover;
  late Future<List<dynamic>> _future;

  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _apiClient = Provider.of<ApiClient>(context, listen: false);
    _chats = ChatsService(_apiClient);
    _discover = DiscoverService(_apiClient);
    _future = _load();

    _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) return;
      setState(() => _future = _load());
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<List<dynamic>> _load() async {
    return _discover.likes(type: 'given');
  }

  String _userId(dynamic l) {
    final profile = l?['profile'] ?? l;
    final user = profile?['user'] ?? l?['user'] ?? l;
    return (user?['user_id'] ?? user?['userId'] ?? profile?['user_id'] ?? profile?['userId'] ?? '').toString();
  }

  String _name(dynamic l) {
    final profile = l?['profile'] ?? l;
    final user = profile?['user'] ?? l?['user'] ?? l;
    final first = (user?['first_name'] ?? user?['firstName'] ?? profile?['first_name'] ?? profile?['firstName'] ?? '').toString();
    final last = (user?['last_name'] ?? user?['lastName'] ?? profile?['last_name'] ?? profile?['lastName'] ?? '').toString();
    final name = ('$first $last').trim();
    return name.isEmpty ? 'User' : name;
  }

  Future<void> _startChat(dynamic profile) async {
    final userId = _userId(profile);
    final name = _name(profile);

    if (userId.isEmpty) return;

    final textController = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('Message $name'),
          content: TextField(
            controller: textController,
            autofocus: true,
            minLines: 1,
            maxLines: 4,
            decoration: const InputDecoration(hintText: 'Say hello...'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(textController.text.trim()),
              child: const Text('Send'),
            ),
          ],
        );
      },
    );

    if (result == null || result.isEmpty) return;

    final sent = await _chats.sendMessage(recipientId: userId, content: result);
    final conversationId = (sent['conversation_id'] ?? sent['conversationId'] ?? sent['conversation']?['conversation_id'] ?? '').toString();

    if (!mounted) return;

    Navigator.of(context).pushReplacementNamed(
      '/chats/chat',
      arguments: {
        'conversationId': conversationId,
        'participantName': name,
        'participantId': userId,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('New chat')),
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
                        'Failed to load users',
                        style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: () => setState(() => _future = _load()),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              );
            }

            final items = snapshot.data ?? const [];
            if (items.isEmpty) {
              return Center(
                child: Text(
                  'No profiles found',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              );
            }

            return ListView.separated(
              itemCount: items.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final p = items[index] as dynamic;
                final userId = _userId(p);
                final name = _name(p);

                return ListTile(
                  leading: CircleAvatar(
                    child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?'),
                  ),
                  title: Text(name),
                  subtitle: const Text('Tap to chat'),
                  onTap: userId.isEmpty ? null : () => _startChat(p),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
