import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_localizations.dart';
import '../../core/pagination.dart';
import '../../core/refresh_manager.dart';
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
  static const _refreshKey = 'groups';
  static const _pollInterval = Duration(seconds: 45);

  late final GroupsService _service;
  late Future<Paginated<Group>> _future;
  final _refreshManager = RefreshManager();

  Timer? _pollTimer;
  StreamSubscription<void>? _refreshSubscription;
  ValueNotifier<int>? _tabIndex;
  bool _isActive = false;

  Future<void> _openCreateGroup() async {
    await Navigator.of(context).pushNamed(NewGroupScreen.routeName);
    if (!mounted) return;
    await _refresh();
  }

  Future<void> _editGroup(Group group) async {
    final nameController = TextEditingController(text: group.name);
    final descController = TextEditingController(text: group.description ?? '');
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(context.l10n.phrase('Edit group')),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: InputDecoration(labelText: context.l10n.phrase('Group name')),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descController,
                decoration: InputDecoration(labelText: context.l10n.phrase('Description')),
                minLines: 2,
                maxLines: 4,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(context.l10n.phrase('Cancel')),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: Text(context.l10n.phrase('Save')),
            ),
          ],
        );
      },
    );
    if (ok != true) return;

    final name = nameController.text.trim();
    final description = descController.text.trim();
    if (name.isEmpty) {
      if (!mounted) return;
      showToast(context, context.l10n.phrase('Group name is required'), isError: true);
      return;
    }

    try {
      await _service.updateGroup(
        groupId: group.groupId,
        name: name,
        description: description,
      );
      if (!mounted) return;
      showToast(context, context.l10n.phrase('Group updated'));
      await _refresh();
    } catch (e) {
      if (!mounted) return;
      showToast(context, '${context.l10n.phrase('Failed to update group')}: $e', isError: true);
    }
  }

  Future<void> _deactivateGroup(Group group) async {
    final shouldDeactivate = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(context.l10n.phrase('Deactivate group')),
        content: Text(
          context.l10n.phrase('This group will be hidden from active lists. You can keep its history.'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(context.l10n.phrase('Cancel')),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(context.l10n.phrase('Deactivate')),
          ),
        ],
      ),
    );

    if (shouldDeactivate != true) return;
    try {
      await _service.deactivateGroup(group.groupId);
      if (!mounted) return;
      showToast(context, context.l10n.phrase('Group deactivated'));
      await _refresh();
    } catch (e) {
      if (!mounted) return;
      showToast(context, '${context.l10n.phrase('Failed to deactivate group')}: $e', isError: true);
    }
  }

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
          return n.isEmpty ? context.l10n.phrase('User') : n;
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
              title: Text('${context.l10n.phrase('Add member to')} $groupName'),
              content: SizedBox(
                width: 360,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: queryController,
                      autofocus: true,
                      decoration: InputDecoration(
                        hintText: context.l10n.phrase('Search by name, email, or phone'),
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
                            return Center(child: Text(context.l10n.phrase('Search failed')));
                          }
                          final items = snapshot.data ?? const <dynamic>[];
                          if (items.isEmpty) {
                            return Center(child: Text(context.l10n.phrase('No users')));
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
                  child: Text(context.l10n.phrase('Close')),
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
    _refreshManager.markFetchCompleted(_refreshKey);

    _tabIndex = Provider.of<ValueNotifier<int>>(context, listen: false);
    _isActive = _tabIndex?.value == 2;
    _tabIndex?.addListener(_onTabChanged);
    _refreshSubscription = _refreshManager.getRefreshStream(_refreshKey).listen((_) {
      if (mounted) {
        _refresh();
      }
    });

    _startPolling();
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
    final nowActive = idx == 2;
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
    _refreshSubscription?.cancel();
    _tabIndex?.removeListener(_onTabChanged);
    super.dispose();
  }

  Future<void> _refresh() async {
    if (!_refreshManager.canFetch(_refreshKey)) return;
    _refreshManager.markFetchStarted(_refreshKey);

    setState(() {
      _future = _service.listGroupsTyped();
    });

    try {
      await _future;
    } finally {
      _refreshManager.markFetchCompleted(_refreshKey);
    }
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
          return _ErrorView(message: context.l10n.phrase('Failed to load groups'), onRetry: _refresh);
        }

        final items = snapshot.data?.items ?? const <Group>[];

        if (items.isEmpty) {
          return _EmptyGroups(onNewGroup: () {
            _openCreateGroup();
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
                trailing: PopupMenuButton<String>(
                  onSelected: (value) async {
                    if (value == 'add') {
                      final userId = await _pickUserToAdd(groupId: groupId, groupName: name);
                      if (userId == null || userId.isEmpty) return;
                      try {
                        await _service.addMemberToGroup(groupId: groupId, userId: userId);
                        if (!context.mounted) return;
                        showToast(context, context.l10n.phrase('Member added'));
                      } catch (e) {
                        if (!context.mounted) return;
                        showToast(context, '${context.l10n.phrase('Failed to add member')}: $e', isError: true);
                      }
                      return;
                    }
                    if (value == 'edit') {
                      await _editGroup(g);
                      return;
                    }
                    if (value == 'deactivate') {
                      await _deactivateGroup(g);
                    }
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem<String>(
                      value: 'add',
                      child: Text(context.l10n.phrase('Add member')),
                    ),
                    PopupMenuItem<String>(
                      value: 'edit',
                      child: Text(context.l10n.phrase('Edit group')),
                    ),
                    PopupMenuItem<String>(
                      value: 'deactivate',
                      child: Text(context.l10n.phrase('Deactivate group')),
                    ),
                  ],
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
              context.l10n.phrase('No groups yet'),
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              context.l10n.phrase('Create a group to start chatting with the community.'),
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: onNewGroup, child: Text(context.l10n.phrase('New group'))),
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
