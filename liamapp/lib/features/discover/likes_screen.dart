import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import 'discover_service.dart';

class LikesScreen extends StatefulWidget {
  const LikesScreen({super.key, required this.type});

  static const routeName = '/discover/likes';

  final String type; // 'given' or 'received'

  @override
  State<LikesScreen> createState() => _LikesScreenState();
}

class _LikesScreenState extends State<LikesScreen> {
  late final DiscoverService _service;
  late Future<List<dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _service = DiscoverService(Provider.of<ApiClient>(context, listen: false));
    _future = _service.likes(type: widget.type);
  }

  Future<void> _refresh() async {
    setState(() {
      _future = _service.likes(type: widget.type);
    });
    await _future;
  }

  String _name(dynamic l) {
    final user = l?['user'] ?? l?['profile']?['user'];
    final first = (user?['first_name'] ?? user?['firstName'] ?? '').toString();
    final last = (user?['last_name'] ?? user?['lastName'] ?? '').toString();
    final name = ('$first $last').trim();
    return name.isEmpty ? 'User' : name;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(widget.type == 'received' ? 'Likes (received)' : 'Likes (given)')),
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
                        'Failed to load likes',
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
                  'No likes yet',
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
                  final l = items[index];
                  final name = _name(l);
                  return ListTile(
                    leading: CircleAvatar(child: Text(name[0].toUpperCase())),
                    title: Text(name),
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
