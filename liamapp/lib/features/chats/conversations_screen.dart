import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/pagination.dart';
import '../../models/conversation.dart';
import 'chats_service.dart';
import 'new_chat_screen.dart';

class ConversationsScreen extends StatefulWidget {
  const ConversationsScreen({super.key});

  static const routeName = '/chats';

  @override
  State<ConversationsScreen> createState() => _ConversationsScreenState();
}

class _ConversationsScreenState extends State<ConversationsScreen> {
  late final ChatsService _service;
  late Future<Paginated<Conversation>> _future;

  @override
  void initState() {
    super.initState();
    _service = ChatsService(Provider.of<ApiClient>(context, listen: false));
    _future = _service.listConversationsTyped();
  }

  Future<void> _refresh() async {
    setState(() {
      _future = _service.listConversationsTyped();
    });
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Paginated<Conversation>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return _ErrorView(
            message: 'Failed to load conversations',
            onRetry: _refresh,
          );
        }

        final items = snapshot.data?.items ?? const <Conversation>[];

        if (items.isEmpty) {
          return _EmptyConversations(onNewChat: () {
            Navigator.of(context).pushNamed(NewChatScreen.routeName);
          });
        }

        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: items.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final c = items[index];
              final conversationId = c.conversationId;
              final title = c.participantName;
              final subtitle = c.lastMessagePreview ?? '';
              final participantId = c.participantId;

              return ListTile(
                leading: CircleAvatar(
                  child: Text(title.isNotEmpty ? title.trim()[0].toUpperCase() : '?'),
                ),
                title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
                subtitle: subtitle.isEmpty
                    ? null
                    : Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis),
                onTap: () {
                  Navigator.of(context).pushNamed(
                    '/chats/chat',
                    arguments: {
                      'conversationId': conversationId,
                      'participantName': title,
                      'participantId': participantId,
                    },
                  );
                },
              );
            },
          ),
        );
      },
    );
  }
}

class _EmptyConversations extends StatelessWidget {
  const _EmptyConversations({required this.onNewChat});

  final VoidCallback onNewChat;

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
              'No conversations yet',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              'Start a new chat to connect with someone.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: onNewChat,
              child: const Text('New chat'),
            ),
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
