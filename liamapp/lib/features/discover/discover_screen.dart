import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import 'discover_service.dart';

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});

  static const routeName = '/discover';

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  late final DiscoverService _service;
  final Set<String> _skippedUserIds = <String>{};
  final ScrollController _scrollController = ScrollController();

  final List<dynamic> _items = <dynamic>[];
  final List<dynamic> _liked = <dynamic>[];
  bool _isLoading = false;
  bool _hasMore = true;
  Object? _lastError;
  static const int _pageSize = 20;

  @override
  void initState() {
    super.initState();
    _service = DiscoverService(Provider.of<ApiClient>(context, listen: false));
    _scrollController.addListener(_onScroll);
    _loadInitial();
  }

  @override
  void dispose() {
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
    return name.isEmpty ? 'User' : name;
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
    await _loadInitial();
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
    return dn.isNotEmpty ? dn : (name.isNotEmpty ? name : 'User');
  }

  String _userId(dynamic p) {
    return (p?['user_id'] ?? p?['userId'] ?? p?['id'] ?? p?['user']?['user_id'] ?? '').toString();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_lastError != null && _items.isEmpty && !_isLoading) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Failed to load discover profiles',
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
          'No profiles found',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      );
    }

    final totalCount = 1 + visibleItems.length + (_isLoading ? 1 : 0);

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView.builder(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        itemCount: totalCount,
        itemBuilder: (context, index) {
          if (index == 0) {
            if (_liked.isEmpty) return const SizedBox.shrink();
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    'Liked profiles',
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
                      return SizedBox(
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
                      );
                    },
                  ),
                ),
                const SizedBox(height: 12),
              ],
            );
          }

          final listIndex = index - 1;

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
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Passed')),
                                  );
                                },
                          child: const Text('Pass'),
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
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text(isMatch ? 'It\'s a match!' : 'Liked')),
                                  );
                                  await _refresh();
                                },
                          child: const Text('Like'),
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
