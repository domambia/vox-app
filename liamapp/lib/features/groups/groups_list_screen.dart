import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/pagination.dart';
import '../../core/toast.dart';
import '../../models/group.dart';
import 'groups_service.dart';
import 'new_group_screen.dart';

class GroupsListScreen extends StatefulWidget {
  const GroupsListScreen({super.key});

  static const routeName = '/groups';

  @override
  State<GroupsListScreen> createState() => _GroupsListScreenState();
}

class _GroupsListScreenState extends State<GroupsListScreen> {
  late final GroupsService _service;
  late Future<Paginated<Group>> _future;

  Timer? _pollTimer;

  Future<String?> _pickUserToAdd({required String groupId, required String groupName}) async {
    final queryController = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) {
        Future<List<dynamic>> searchFuture = Future.value(const <dynamic>[]);

        String name(dynamic u) {
          final first = (u?['first_name'] ?? u?['firstName'] ?? '').toString();
          final last = (u?['last_name'] ?? u?['lastName'] ?? '').toString();
          final n = ('$first $last').trim();
          return n.isEmpty ? 'User' : n;
        }

        String userId(dynamic u) {
          return (u?['user_id'] ?? u?['userId'] ?? '').toString();
        }

        String subtitle(dynamic u) {
          final email = (u?['email'] ?? '').toString();
          final phone = (u?['phone_number'] ?? u?['phoneNumber'] ?? '').toString();
          if (email.isNotEmpty) return email;
          if (phone.isNotEmpty) return phone;
          return '';
        }

        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: Text('Add member to $groupName'),
              content: SizedBox(
                width: 360,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: queryController,
                      autofocus: true,
                      decoration: const InputDecoration(
                        hintText: 'Search by name, email, or phone',
                      ),
                      onChanged: (v) {
                        final q = v.trim();
                        setState(() {
                          searchFuture = q.isEmpty
                              ? Future.value(const <dynamic>[])
                              : _service.searchUsersForGroupMember(groupId: groupId, query: q);
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    Flexible(
                      child: FutureBuilder<List<dynamic>>(
                        future: searchFuture,
                        builder: (context, snapshot) {
                          if (snapshot.connectionState != ConnectionState.done) {
                            return const Center(child: CircularProgressIndicator());
                          }
                          if (snapshot.hasError) {
                            return const Center(child: Text('Search failed'));
                          }
                          final items = snapshot.data ?? const <dynamic>[];
                          if (items.isEmpty) {
                            return const Center(child: Text('No users'));
                          }
                          return ListView.separated(
                            shrinkWrap: true,
                            itemCount: items.length,
                            separatorBuilder: (_, __) => const Divider(height: 1),
                            itemBuilder: (context, index) {
                              final u = items[index];
                              final id = userId(u);
                              final n = name(u);
                              final sub = subtitle(u);
                              return ListTile(
                                leading: CircleAvatar(child: Text(n.isNotEmpty ? n[0].toUpperCase() : '?')),
                                title: Text(n, maxLines: 1, overflow: TextOverflow.ellipsis),
                                subtitle: sub.isEmpty ? null : Text(sub, maxLines: 1, overflow: TextOverflow.ellipsis),
                                onTap: id.isEmpty ? null : () => Navigator.of(context).pop(id),
                              );
                            },
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Close'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  void initState() {
    super.initState();
    _service = GroupsService(Provider.of<ApiClient>(context, listen: false));
    _future = _service.listGroupsTyped();

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
      _future = _service.listGroupsTyped();
    });
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Paginated<Group>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return _ErrorView(message: 'Failed to load groups', onRetry: _refresh);
        }

        final items = snapshot.data?.items ?? const <Group>[];

        if (items.isEmpty) {
          return _EmptyGroups(onNewGroup: () {
            Navigator.of(context).pushNamed(NewGroupScreen.routeName);
          });
        }

        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: items.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final g = items[index];
              final groupId = g.groupId;
              final name = g.name;
              final description = g.description ?? '';

              return ListTile(
                leading: CircleAvatar(child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'G')),
                title: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis),
                subtitle: description.isEmpty
                    ? null
                    : Text(description, maxLines: 1, overflow: TextOverflow.ellipsis),
                trailing: IconButton(
                  icon: const Icon(Icons.person_add_alt_1),
                  tooltip: 'Add member',
                  onPressed: () async {
                    final userId = await _pickUserToAdd(groupId: groupId, groupName: name);
                    if (userId == null || userId.isEmpty) return;

                    try {
                      await _service.addMemberToGroup(groupId: groupId, userId: userId);
                      if (!context.mounted) return;
                      showToast(context, 'Member added');
                    } catch (e) {
                      if (!context.mounted) return;
                      showToast(context, 'Failed to add member: $e', isError: true);
                    }
                  },
                ),
                onTap: () async {
                  await Navigator.of(context).pushNamed(
                    '/groups/chat',
                    arguments: {
                      'groupId': groupId,
                      'groupName': name,
                    },
                  );

                  if (!context.mounted) return;
                  await _refresh();
                },
              );
            },
          ),
        );
      },
    );
  }
}

class _EmptyGroups extends StatelessWidget {
  const _EmptyGroups({required this.onNewGroup});

  final VoidCallback onNewGroup;

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
              'No groups yet',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              'Create a group to start chatting with the community.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: onNewGroup, child: const Text('New group')),
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
