import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/pagination.dart';
import '../../models/conversation.dart';
import '../discover/discover_service.dart';
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
  late final DiscoverService _discover;
  late Future<List<dynamic>> _likedFuture;

  Timer? _pollTimer;
  ValueNotifier<int>? _tabIndex;
  bool _wasActive = false;

  @override
  void initState() {
    super.initState();
    final apiClient = Provider.of<ApiClient>(context, listen: false);
    _service = ChatsService(apiClient);
    _discover = DiscoverService(apiClient);
    _future = _service.listConversationsTyped();
    _likedFuture = _discover.likes(type: 'given');

    _tabIndex = Provider.of<ValueNotifier<int>>(context, listen: false);
    _wasActive = _tabIndex?.value == 1;
    _tabIndex?.addListener(_onTabChanged);

    _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) return;
      _refresh();
    });
  }

  void _onTabChanged() {
    final idx = _tabIndex?.value;
    final isActive = idx == 1;
    if (isActive && !_wasActive && mounted) {
      _refresh();
    }
    _wasActive = isActive;
  }

  Future<void> _refresh() async {
    setState(() {
      _future = _service.listConversationsTyped();
      _likedFuture = _discover.likes(type: 'given');
    });
    await _future;
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _tabIndex?.removeListener(_onTabChanged);
    super.dispose();
  }

  String _likedUserId(dynamic l) {
    final profile = l?['profile'] ?? l;
    final user = profile?['user'] ?? l?['user'] ?? l;
    return (user?['user_id'] ?? user?['userId'] ?? profile?['user_id'] ?? profile?['userId'] ?? '').toString();
  }

  String _likedName(dynamic l) {
    final profile = l?['profile'] ?? l;
    final user = profile?['user'] ?? l?['user'] ?? l;
    final first = (user?['first_name'] ?? user?['firstName'] ?? profile?['first_name'] ?? profile?['firstName'] ?? '').toString();
    final last = (user?['last_name'] ?? user?['lastName'] ?? profile?['last_name'] ?? profile?['lastName'] ?? '').toString();
    final name = ('$first $last').trim();
    return name.isEmpty ? 'User' : name;
  }

  Future<void> _startChatFromLiked(dynamic like) async {
    final userId = _likedUserId(like);
    final name = _likedName(like);
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

    final sent = await _service.sendMessage(recipientId: userId, content: result);
    final conversationId = (sent['conversation_id'] ?? sent['conversationId'] ?? sent['conversation']?['conversation_id'] ?? '').toString();
    if (!context.mounted) return;

    await Navigator.of(context).pushNamed(
      '/chats/chat',
      arguments: {
        'conversationId': conversationId,
        'participantName': name,
        'participantId': userId,
      },
    );

    if (!mounted) return;
    await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: Future.wait<dynamic>([_future, _likedFuture]),
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return _ErrorView(
            message: 'Failed to load chats',
            onRetry: _refresh,
          );
        }

        final data = snapshot.data ?? const <dynamic>[];
        final conversations = data.isNotEmpty && data[0] is Paginated<Conversation>
            ? (data[0] as Paginated<Conversation>).items
            : const <Conversation>[];
        final liked = data.length > 1 && data[1] is List ? (data[1] as List).cast<dynamic>() : const <dynamic>[];

        if (conversations.isEmpty && liked.isEmpty) {
          return _EmptyConversations(onNewChat: () {
            Navigator.of(context).pushNamed(NewChatScreen.routeName);
          });
        }

        final likedSectionCount = liked.isEmpty ? 0 : 1; // one horizontal strip
        final conversationsSectionCount = conversations.isEmpty ? 0 : (1 + conversations.length);
        final total = likedSectionCount + conversationsSectionCount;

        Widget likedStrip() {
          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: Text(
                    'Liked users',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                SizedBox(
                  height: 92,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: liked.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (context, i) {
                      final l = liked[i];
                      final uid = _likedUserId(l);
                      final name = _likedName(l);
                      return SizedBox(
                        width: 92,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: uid.isEmpty ? null : () => _startChatFromLiked(l),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              CircleAvatar(
                                radius: 26,
                                child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?'),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: total,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              var i = index;

              if (liked.isNotEmpty) {
                if (i == 0) {
                  return likedStrip();
                }
                i -= 1;
              }

              if (conversations.isNotEmpty) {
                if (i == 0) {
                  return const ListTile(
                    title: Text('Conversations'),
                  );
                }
                final c = conversations[i - 1];
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
                  onTap: () async {
                    await Navigator.of(context).pushNamed(
                      '/chats/chat',
                      arguments: {
                        'conversationId': conversationId,
                        'participantName': title,
                        'participantId': participantId,
                      },
                    );

                    if (!context.mounted) return;
                    await _refresh();
                  },
                );
              }

              return const SizedBox.shrink();
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
