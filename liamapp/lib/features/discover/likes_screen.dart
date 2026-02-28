import 'dart:async';

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

  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _service = DiscoverService(Provider.of<ApiClient>(context, listen: false));
    _future = _service.likes(type: widget.type);

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
      _future = _service.likes(type: widget.type);
    });
    await _future;
  }

  String _name(dynamic l) {
    final profile = l?['profile'] ?? l;
    final user = profile?['user'] ?? l?['user'] ?? l;
    final first = (user?['first_name'] ?? user?['firstName'] ?? profile?['first_name'] ?? profile?['firstName'] ?? '').toString();
    final last = (user?['last_name'] ?? user?['lastName'] ?? profile?['last_name'] ?? profile?['lastName'] ?? '').toString();
    final name = ('$first $last').trim();
    return name.isEmpty ? 'User' : name;
  }

  String _bio(dynamic l) {
    final profile = l?['profile'] ?? l;
    final prof = profile?['profile'] ?? {};
    return (prof?['bio'] ?? '').toString();
  }

  String _userId(dynamic l) {
    final profile = l?['profile'] ?? l;
    final user = profile?['user'] ?? l?['user'] ?? l;
    return (user?['user_id'] ?? user?['userId'] ?? profile?['user_id'] ?? profile?['userId'] ?? '').toString();
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
                  final bio = _bio(l);
                  return ListTile(
                    leading: CircleAvatar(child: Text(name[0].toUpperCase())),
                    title: Text(name),
                    subtitle: bio.isEmpty ? null : Text(bio, maxLines: 1, overflow: TextOverflow.ellipsis),
                    trailing: IconButton(
                      onPressed: () async {
                        final uid = _userId(l);
                        if (uid.isEmpty) return;
                        await _service.unlikeProfile(uid);
                        if (!mounted) return;
                        await _refresh();
                      },
                      icon: const Icon(Icons.close),
                      tooltip: 'Unlike',
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
