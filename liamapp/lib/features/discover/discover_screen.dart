import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_localizations.dart';
import '../../core/config.dart';
import '../../core/refresh_manager.dart';
import '../../core/toast.dart';
import '../../models/post.dart';
import '../posts/create_post_screen.dart';
import '../posts/post_view_screen.dart';
import '../posts/posts_service.dart';
import 'discover_service.dart';
import 'profile_view_screen.dart';

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});

  static const routeName = '/discover';

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  static const _refreshKey = 'discover';
  static const _pollInterval = Duration(seconds: 60);

  late final DiscoverService _service;
  late final PostsService _postsService;
  final Set<String> _skippedUserIds = <String>{};
  final ScrollController _scrollController = ScrollController();
  final _refreshManager = RefreshManager();

  final List<dynamic> _items = <dynamic>[];
  final List<dynamic> _liked = <dynamic>[];
  List<Post> _posts = <Post>[];
  bool _postsLoading = false;
  Timer? _pollTimer;
  bool _isLoading = false;
  bool _hasMore = true;
  Object? _lastError;
  static const int _pageSize = 20;

  ValueNotifier<int>? _tabIndex;
  bool _isActive = false;

  @override
  void initState() {
    super.initState();
    final apiClient = Provider.of<ApiClient>(context, listen: false);
    _service = DiscoverService(apiClient);
    _postsService = PostsService(apiClient);
    _scrollController.addListener(_onScroll);
    _loadInitial();
    _loadPosts();

    _tabIndex = Provider.of<ValueNotifier<int>>(context, listen: false);
    _isActive = _tabIndex?.value == 0;
    _tabIndex?.addListener(_onTabChanged);

    _startPolling();
  }

  Future<void> _loadPosts() async {
    if (_postsLoading) return;
    setState(() => _postsLoading = true);
    try {
      final posts = await _postsService.getRecentPosts(limit: 20);
      if (!mounted) return;
      setState(() => _posts = posts);
    } catch (e) {
      debugPrint('[DiscoverScreen] Failed to load posts: $e');
    } finally {
      if (mounted) setState(() => _postsLoading = false);
    }
  }

  String _absoluteUrl(String fileUrl) {
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl;
    final base = AppConfig.apiBaseUrl;
    final idx = base.indexOf('/api/');
    final origin = idx == -1 ? base : base.substring(0, idx);
    return '$origin$fileUrl';
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
    final nowActive = idx == 0;
    if (nowActive && !_isActive && mounted) {
      if (_refreshManager.shouldRefresh(_refreshKey, minInterval: const Duration(seconds: 15))) {
        _refresh();
      }
    }
    _isActive = nowActive;
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _tabIndex?.removeListener(_onTabChanged);
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_hasMore || _isLoading) return;
    final pos = _scrollController.position;
    if (!pos.hasPixels || !pos.hasContentDimensions) return;
    if (pos.pixels >= pos.maxScrollExtent - 240) {
      _loadMore();
    }
  }

  String _likedUserId(dynamic l) {
    final p = l?['profile'] ?? l;
    return (p?['user_id'] ?? p?['userId'] ?? '').toString();
  }

  String _likedName(dynamic l) {
    final p = l?['profile'] ?? l;
    final first = (p?['first_name'] ?? p?['firstName'] ?? '').toString();
    final last = (p?['last_name'] ?? p?['lastName'] ?? '').toString();
    final name = ('$first $last').trim();
    return name.isEmpty ? context.l10n.phrase('User') : name;
  }

  String _likedBio(dynamic l) {
    final p = l?['profile'] ?? l;
    final prof = p?['profile'] ?? {};
    return (prof?['bio'] ?? '').toString();
  }

  Future<void> _loadInitial() async {
    setState(() {
      _items.clear();
      _skippedUserIds.clear();
      _hasMore = true;
      _lastError = null;
    });
    await _loadLiked();
    await _loadMore();
  }

  Future<void> _loadLiked() async {
    try {
      final liked = await _service.likes(type: 'given');
      if (!mounted) return;
      setState(() {
        _liked
          ..clear()
          ..addAll(liked);
      });
    } catch (_) {
      // ignore liked load failures; discover list should still work
    }
  }

  Future<void> _loadMore() async {
    if (_isLoading || !_hasMore) return;
    setState(() => _isLoading = true);
    try {
      final next = await _service.discover(offset: _items.length, limit: _pageSize);
      if (!mounted) return;
      setState(() {
        _items.addAll(next);
        _hasMore = next.length == _pageSize;
        _lastError = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _lastError = e;
        _hasMore = false;
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _refresh() async {
    if (!_refreshManager.canFetch(_refreshKey)) return;
    _refreshManager.markFetchStarted(_refreshKey);

    try {
      await Future.wait([_loadInitial(), _loadPosts()]);
    } finally {
      _refreshManager.markFetchCompleted(_refreshKey);
    }
  }

  void _skip(String userId) {
    if (userId.trim().isEmpty) return;
    setState(() {
      _skippedUserIds.add(userId);
    });
  }

  String _displayName(dynamic p) {
    final user = p?['user'] ?? {};
    final first = (user?['first_name'] ?? user?['firstName'] ?? p?['first_name'] ?? p?['firstName'] ?? '').toString();
    final last = (user?['last_name'] ?? user?['lastName'] ?? p?['last_name'] ?? p?['lastName'] ?? '').toString();
    final dn = (p?['display_name'] ?? p?['displayName'] ?? '').toString();
    final name = ([first, last].where((x) => x.trim().isNotEmpty).join(' ')).trim();
    return dn.isNotEmpty ? dn : (name.isNotEmpty ? name : context.l10n.phrase('User'));
  }

  String _userId(dynamic p) {
    return (p?['user_id'] ?? p?['userId'] ?? p?['id'] ?? p?['user']?['user_id'] ?? '').toString();
  }

  Future<void> _openCreatePost() async {
    final result = await Navigator.of(context).pushNamed(CreatePostScreen.routeName);
    if (result == true) {
      _loadPosts();
    }
  }

  void _openPost(Post post) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PostViewScreen(post: post),
      ),
    );
  }

  Widget _buildPostsSection(ThemeData theme) {
    final colorScheme = theme.colorScheme;
    final l10n = context.l10n;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.auto_awesome, color: colorScheme.primary, size: 20),
            const SizedBox(width: 8),
            Text(
              l10n.phrase('Updates'),
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const Spacer(),
            TextButton.icon(
              onPressed: _openCreatePost,
              icon: const Icon(Icons.add, size: 18),
              label: Text(l10n.phrase('Post')),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 180,
          child: _postsLoading && _posts.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : _posts.isEmpty
                  ? _buildEmptyPostsState(theme, colorScheme)
                  : ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _posts.length + 1,
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemBuilder: (context, i) {
                        if (i == 0) {
                          return _buildAddPostCard(theme, colorScheme);
                        }
                        final post = _posts[i - 1];
                        return _buildPostCard(post, theme, colorScheme);
                      },
                    ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildAddPostCard(ThemeData theme, ColorScheme colorScheme) {
    return GestureDetector(
      onTap: _openCreatePost,
      child: Container(
        width: 110,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [colorScheme.primary, colorScheme.secondary],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withAlpha(50),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.add, color: Colors.white, size: 28),
            ),
            const SizedBox(height: 12),
            Text(
              context.l10n.phrase('Add Post'),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPostCard(Post post, ThemeData theme, ColorScheme colorScheme) {
    return GestureDetector(
      onTap: () => _openPost(post),
      child: Container(
        width: 130,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: colorScheme.outlineVariant),
          color: colorScheme.surface,
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (post.imageUrl != null && post.imageUrl!.isNotEmpty)
              Image.network(
                _absoluteUrl(post.imageUrl!),
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: colorScheme.surfaceContainerHighest,
                  child: Icon(Icons.broken_image_outlined, color: colorScheme.onSurfaceVariant),
                ),
              )
            else
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      colorScheme.primaryContainer,
                      colorScheme.secondaryContainer,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                padding: const EdgeInsets.all(12),
                child: Center(
                  child: Text(
                    post.content.length > 50 ? '${post.content.substring(0, 50)}...' : post.content,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onPrimaryContainer,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.transparent, Colors.black.withAlpha(150)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      post.authorName ?? context.l10n.phrase('User'),
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      post.timeAgo,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: Colors.white70,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              top: 8,
              left: 8,
              child: Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: colorScheme.primary,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: Center(
                  child: Text(
                    (post.authorName ?? context.l10n.phrase('U'))[0].toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyPostsState(ThemeData theme, ColorScheme colorScheme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.post_add, size: 48, color: colorScheme.onSurfaceVariant),
          const SizedBox(height: 12),
          Text(
            context.l10n.phrase('No updates yet'),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: _openCreatePost,
            icon: const Icon(Icons.add, size: 18),
            label: Text(context.l10n.phrase('Create first post')),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;

    if (_lastError != null && _items.isEmpty && !_isLoading) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                l10n.phrase('Failed to load discover profiles'),
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              FilledButton(onPressed: _refresh, child: Text(l10n.retry)),
            ],
          ),
        ),
      );
    }

    final visibleItems = _items.where((p) {
      final id = _userId(p);
      return id.trim().isEmpty ? true : !_skippedUserIds.contains(id);
    }).toList(growable: false);

    if (_isLoading && _items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (!_isLoading && visibleItems.isEmpty) {
      return Center(
        child: Text(
          l10n.phrase('No profiles found'),
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      );
    }

    final totalCount = 2 + visibleItems.length + (_isLoading ? 1 : 0);

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView.builder(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        itemCount: totalCount,
        itemBuilder: (context, index) {
          if (index == 0) {
            return _buildPostsSection(theme);
          }

          if (index == 1) {
            if (_liked.isEmpty) return const SizedBox.shrink();
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    l10n.phrase('Liked profiles'),
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                  ),
                ),
                SizedBox(
                  height: 92,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _liked.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (context, i) {
                      final l = _liked[i];
                      final name = _likedName(l);
                      final uid = _likedUserId(l);
                      return InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: uid.isEmpty
                            ? null
                            : () {
                                Navigator.of(context).pushNamed(
                                  ProfileViewScreen.routeName,
                                  arguments: {
                                    'userId': uid,
                                    'displayName': name,
                                  },
                                );
                              },
                        child: SizedBox(
                          width: 92,
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
                                style: theme.textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 12),
              ],
            );
          }

          final listIndex = index - 2;

          if (listIndex >= visibleItems.length) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: CircularProgressIndicator()),
            );
          }

          final p = visibleItems[listIndex];
          final name = _displayName(p);
          final userId = _userId(p);
          final bio = (p?['bio'] ?? '').toString();
          final location = (p?['location'] ?? '').toString();

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?')),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            if (location.isNotEmpty)
                              Text(
                                location,
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: theme.colorScheme.onSurfaceVariant,
                                ),
                              ),
                          ],
                        ),
                      ),
                      if (userId.isNotEmpty)
                        IconButton(
                          tooltip: l10n.phrase('View profile'),
                          icon: const Icon(Icons.chevron_right),
                          onPressed: () {
                            Navigator.of(context).pushNamed(
                              ProfileViewScreen.routeName,
                              arguments: {
                                'userId': userId,
                                'displayName': name,
                              },
                            );
                          },
                        ),
                    ],
                  ),
                  if (bio.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(bio),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: userId.isEmpty
                              ? null
                              : () async {
                                  _skip(userId);
                                  if (!mounted) return;
                                  showToast(context, l10n.phrase('Passed'));
                                },
                          child: Text(l10n.phrase('Pass')),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: userId.isEmpty
                              ? null
                              : () async {
                                  final resp = await _service.likeProfile(userId);
                                  if (!mounted) return;
                                  final isMatch = resp['isMatch'] == true;
                                  showToast(context, isMatch ? l10n.phrase("It's a match!") : l10n.phrase('Liked'));
                                  await _refresh();
                                },
                          child: Text(l10n.phrase('Like')),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
