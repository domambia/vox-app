import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import 'profile_service.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  static const routeName = '/profile/edit';

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();

  final _displayNameController = TextEditingController();
  final _bioController = TextEditingController();
  final _locationController = TextEditingController();

  String? _userId;
  bool _isCreate = false;
  bool _submitting = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = (ModalRoute.of(context)?.settings.arguments as Map?) ?? const {};
    final mode = (args['mode'] ?? 'edit').toString();
    _isCreate = mode == 'create';

    final profile = args['profile'] as Map?;
    if (profile != null) {
      _displayNameController.text = (profile['display_name'] ?? profile['displayName'] ?? '').toString();
      _bioController.text = (profile['bio'] ?? '').toString();
      _locationController.text = (profile['location'] ?? '').toString();
      _userId = (profile['user_id'] ?? profile['userId'] ?? profile['user']?['user_id'] ?? profile['user']?['userId'] ?? '').toString();
    }
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _bioController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_submitting) return;
    final ok = _formKey.currentState?.validate() ?? false;
    if (!ok) return;

    setState(() => _submitting = true);
    try {
      final service = ProfileService(Provider.of<ApiClient>(context, listen: false));
      if (_isCreate) {
        await service.createProfile(
          bio: _bioController.text.trim().isEmpty ? null : _bioController.text.trim(),
          location: _locationController.text.trim().isEmpty ? null : _locationController.text.trim(),
        );
      } else {
        final userId = _userId;
        if (userId == null || userId.isEmpty) {
          throw StateError('Missing userId');
        }
        await service.updateProfile(
          userId: userId,
          bio: _bioController.text.trim(),
          location: _locationController.text.trim(),
        );
      }

      if (!mounted) return;
      Navigator.of(context).pop(true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(_isCreate ? 'Create profile' : 'Edit profile')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            Text(
              _isCreate ? 'Tell people about you' : 'Update your details',
              style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 24),
            Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    controller: _displayNameController,
                    decoration: const InputDecoration(labelText: 'Display name'),
                    validator: (value) {
                      final v = (value ?? '').trim();
                      if (v.isEmpty) return 'Display name is required';
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _locationController,
                    decoration: const InputDecoration(labelText: 'Location'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _bioController,
                    minLines: 2,
                    maxLines: 5,
                    decoration: const InputDecoration(labelText: 'Bio'),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _submitting ? null : _submit,
                      child: Text(_submitting ? 'Saving...' : 'Save'),
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
