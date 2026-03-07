import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/pagination.dart';
import '../../core/refresh_manager.dart';
import '../../core/socket_service.dart';
import '../../core/app_localizations.dart';
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
  static const _refreshKey = 'conversations';
  static const _pollInterval = Duration(seconds: 30);

  late final ChatsService _service;
  late Future<Paginated<Conversation>> _future;
  late final DiscoverService _discover;
  late Future<List<dynamic>> _likedFuture;
  final _refreshManager = RefreshManager();

  Timer? _pollTimer;
  ValueNotifier<int>? _tabIndex;
  bool _isActive = false;
  StreamSubscription<Map<String, dynamic>>? _messageSub;

  @override
  void initState() {
    super.initState();
    final apiClient = Provider.of<ApiClient>(context, listen: false);
    _service = ChatsService(apiClient);
    _discover = DiscoverService(apiClient);
    _future = _service.listConversationsTyped();
    _likedFuture = _discover.likes(type: 'given');
    _refreshManager.markFetchCompleted(_refreshKey);

    _tabIndex = Provider.of<ValueNotifier<int>>(context, listen: false);
    _isActive = _tabIndex?.value == 1;
    _tabIndex?.addListener(_onTabChanged);

    _startPolling();

    final socketService = Provider.of<SocketService>(context, listen: false);
    _messageSub = socketService.onMessageReceived.listen((_) {
      if (_isActive && mounted) {
        _refreshManager.invalidate(_refreshKey);
        _refresh();
      }
    });
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(_pollInterval, (_) {
      if (!mounted || !_isActive) return;
      if (_refreshManager.shouldRefresh(_refreshKey, minInterval: _pollInterval)) {
        _refresh();
      }
    });
  }

  void _onTabChanged() {
    final idx = _tabIndex?.value;
    final nowActive = idx == 1;
    if (nowActive && !_isActive && mounted) {
      if (_refreshManager.shouldRefresh(_refreshKey, minInterval: const Duration(seconds: 10))) {
        _refresh();
      }
    }
    _isActive = nowActive;
  }

  Future<void> _refresh() async {
    if (!_refreshManager.canFetch(_refreshKey)) return;
    _refreshManager.markFetchStarted(_refreshKey);

    setState(() {
      _future = _service.listConversationsTyped();
      _likedFuture = _discover.likes(type: 'given');
    });

    try {
      await _future;
    } finally {
      _refreshManager.markFetchCompleted(_refreshKey);
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _messageSub?.cancel();
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
    return name.isEmpty ? context.l10n.phrase('User') : name;
  }

  Future<void> _startChatFromLiked(dynamic like) async {
    final userId = _likedUserId(like);
    final name = _likedName(like);
    if (userId.isEmpty) return;

    final textController = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (context) {
        final l10n = context.l10n;
        return AlertDialog(
          title: Text('${l10n.phrase('Message')} $name'),
          content: TextField(
            controller: textController,
            autofocus: true,
            minLines: 1,
            maxLines: 4,
            decoration: InputDecoration(hintText: l10n.phrase('Say hello...')),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(l10n.cancel),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(textController.text.trim()),
              child: Text(l10n.phrase('Send')),
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
            message: context.l10n.phrase('Failed to load chats'),
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
                Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: Text(
                    context.l10n.phrase('Liked users'),
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
                  return ListTile(
                    title: Text(context.l10n.phrase('Conversations')),
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
              context.l10n.phrase('No conversations yet'),
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              context.l10n.phrase('Start a new chat to connect with someone.'),
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: onNewChat,
              child: Text(context.l10n.phrase('New chat')),
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
              child: Text(context.l10n.retry),
            ),
          ],
        ),
      ),
    );
  }
}
