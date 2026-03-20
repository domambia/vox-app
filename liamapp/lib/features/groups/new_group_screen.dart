import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_localizations.dart';
import '../../core/refresh_manager.dart';
import 'groups_service.dart';

class NewGroupScreen extends StatefulWidget {
  const NewGroupScreen({super.key});

  static const routeName = '/groups/new';

  @override
  State<NewGroupScreen> createState() => _NewGroupScreenState();
}

class _NewGroupScreenState extends State<NewGroupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descController = TextEditingController();

  bool _submitting = false;
  bool _didTriggerRefresh = false;

  void _triggerGroupsRefresh() {
    if (_didTriggerRefresh) return;
    _didTriggerRefresh = true;
    RefreshManager().triggerRefresh('groups');
  }

  @override
  void dispose() {
    _triggerGroupsRefresh();
    _nameController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_submitting) return;
    final ok = _formKey.currentState?.validate() ?? false;
    if (!ok) return;

    setState(() => _submitting = true);
    try {
      final service = GroupsService(Provider.of<ApiClient>(context, listen: false));
      final group = await service.createGroup(
        name: _nameController.text.trim(),
        description: _descController.text.trim().isEmpty ? null : _descController.text.trim(),
        category: 'general',
        isPublic: true,
      );

      final groupId = (group['group_id'] ?? group['groupId'] ?? group['id'] ?? '').toString();
      final name = (group['name'] ?? _nameController.text.trim()).toString();

      if (!mounted) return;
      _triggerGroupsRefresh();
      Navigator.of(context).pushReplacementNamed(
        '/groups/chat',
        arguments: {
          'groupId': groupId,
          'groupName': name,
        },
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.phrase('New group'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            Text(
              l10n.phrase('Create a group'),
              style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              l10n.phrase('Give your group a name and optional description.'),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    controller: _nameController,
                    decoration: InputDecoration(labelText: l10n.phrase('Group name')),
                    validator: (value) {
                      final v = (value ?? '').trim();
                      if (v.isEmpty) return l10n.phrase('Group name is required');
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _descController,
                    decoration: InputDecoration(labelText: l10n.phrase('Description (optional)')),
                    minLines: 2,
                    maxLines: 4,
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _submitting ? null : _submit,
                      child: Text(_submitting ? l10n.phrase('Creating...') : l10n.phrase('Create')),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
