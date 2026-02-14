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
  late Future<List<dynamic>> _future;
  final Set<String> _skippedUserIds = <String>{};

  @override
  void initState() {
    super.initState();
    _service = DiscoverService(Provider.of<ApiClient>(context, listen: false));
    _future = _service.discover();
  }

  Future<void> _refresh() async {
    setState(() {
      _future = _service.discover();
    });
    await _future;
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

    return FutureBuilder<List<dynamic>>(
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

        final items = snapshot.data ?? const [];
        final visibleItems = items.where((p) {
          final id = _userId(p);
          return id.trim().isEmpty ? true : !_skippedUserIds.contains(id);
        }).toList(growable: false);

        if (visibleItems.isEmpty) {
          return Center(
            child: Text(
              'No profiles found',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            itemCount: visibleItems.length,
            itemBuilder: (context, index) {
              final p = visibleItems[index];
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
      },
    );
  }
}
