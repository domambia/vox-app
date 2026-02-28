import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:just_audio/just_audio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import 'package:record/record.dart';

import 'dart:io';

import '../../core/api_client.dart';
import '../../core/config.dart';
import '../../core/toast.dart';
import '../auth/auth_controller.dart';
import '../calls/call_history_screen.dart';
import '../kyc/kyc_home_screen.dart';
import 'edit_profile_screen.dart';
import 'notifications_screen.dart';
import 'profile_service.dart';
import 'settings_screen.dart';

class ProfileHomeScreen extends StatefulWidget {
  const ProfileHomeScreen({super.key});

  static const routeName = '/profile';

  @override
  State<ProfileHomeScreen> createState() => _ProfileHomeScreenState();
}

class _ProfileHomeScreenState extends State<ProfileHomeScreen> {
  late final ProfileService _service;
  late Future<Map<String, dynamic>> _future;

  Timer? _pollTimer;
  final AudioPlayer _player = AudioPlayer();
  final AudioRecorder _recorder = AudioRecorder();
  bool _recording = false;
  bool _busyVoice = false;
  String? _recordPath;

  @override
  void initState() {
    super.initState();
    _service = ProfileService(Provider.of<ApiClient>(context, listen: false));
    _future = _service.getMyProfile();

    _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) return;
      _refresh();
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _player.dispose();
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    setState(() {
      _future = _service.getMyProfile();
    });
    await _future;
  }

  String _absoluteUrl(String fileUrl) {
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl;
    final base = AppConfig.apiBaseUrl;
    final idx = base.indexOf('/api/');
    final origin = idx == -1 ? base : base.substring(0, idx);
    return '$origin$fileUrl';
  }

  Future<bool> _ensureMicPermission() async {
    final status = await Permission.microphone.request();
    return status.isGranted;
  }

  Future<void> _toggleRecord() async {
    if (_busyVoice) return;
    final ok = await _ensureMicPermission();
    if (!ok) {
      if (!mounted) return;
      showToast(context, 'Microphone permission is required to record a voice bio.', isError: true);
      return;
    }

    if (_recording) {
      setState(() => _busyVoice = true);
      String? stoppedPath;
      try {
        stoppedPath = await _recorder.stop();
      } on MissingPluginException {
        if (!mounted) return;
        showToast(context, 'Voice recording is not available on this build.', isError: true);
      } finally {
        if (mounted) {
          setState(() {
            _recording = false;
            _busyVoice = false;
          });
        }
      }
      if (stoppedPath != null && stoppedPath.isNotEmpty) {
        _recordPath = stoppedPath;
      }
      return;
    }

    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/voice-bio-${DateTime.now().millisecondsSinceEpoch}.m4a');
    _recordPath = file.path;
    try {
      await _recorder.start(const RecordConfig(), path: file.path);
    } on MissingPluginException {
      if (!mounted) return;
      showToast(context, 'Voice recording is not available on this build. Please fully restart the app after flutter pub get.', isError: true);
      return;
    }
    if (!mounted) return;
    setState(() => _recording = true);
  }

  Future<void> _uploadRecordedVoiceBio() async {
    final path = _recordPath;
    if (path == null || path.isEmpty) return;
    if (_busyVoice) return;
    setState(() => _busyVoice = true);
    try {
      await _service.uploadVoiceBio(filePath: path);
      await _refresh();
      if (!mounted) return;
      showToast(context, 'Voice bio saved.');
    } on DioException catch (e) {
      if (!mounted) return;
      showToast(context, messageFromDioException(e), isError: true);
    } finally {
      if (mounted) setState(() => _busyVoice = false);
    }
  }

  Future<void> _playVoiceBio(String url) async {
    if (_busyVoice) return;
    setState(() => _busyVoice = true);
    try {
      await _player.setUrl(_absoluteUrl(url));
      await _player.play();
    } catch (e) {
      if (!mounted) return;
      showToast(context, 'Failed to play voice bio: $e', isError: true);
    } finally {
      if (mounted) setState(() => _busyVoice = false);
    }
  }

  Future<void> _stopVoiceBio() async {
    await _player.stop();
    if (!mounted) return;
    setState(() {});
  }

  Future<void> _deleteVoiceBio() async {
    if (_busyVoice) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete voice bio?'),
        content: const Text('This will remove your voice bio from your profile.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Delete')),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _busyVoice = true);
    try {
      await _service.deleteVoiceBio();
      await _refresh();
      if (!mounted) return;
      showToast(context, 'Voice bio deleted.');
    } finally {
      if (mounted) setState(() => _busyVoice = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return FutureBuilder<Map<String, dynamic>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }

        // If no profile exists yet, backend likely returns 404.
        if (snapshot.hasError) {
          final err = snapshot.error;
          final isNotFound = err is DioException && err.response?.statusCode == 404;

          if (isNotFound) {
            return _NoProfileView(
              onCreate: () async {
                final ok = await Navigator.of(context).pushNamed(EditProfileScreen.routeName, arguments: {'mode': 'create'});
                if (ok == true) {
                  await _refresh();
                }
              },
            );
          }

          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Failed to load profile',
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(onPressed: _refresh, child: const Text('Retry')),
                ],
              ),
            ),
          );
        }

        final p = snapshot.data ?? const <String, dynamic>{};
        final displayName = (p['display_name'] ?? p['displayName'] ?? 'User').toString();
        final bio = (p['bio'] ?? '').toString();
        final location = (p['location'] ?? '').toString();
        final voiceBioUrl = (p['voice_bio_url'] ?? p['voiceBioUrl'] ?? '').toString();
        final interests = (p['interests'] is List ? (p['interests'] as List).whereType<String>().toList() : <String>[]);
        final completeness = (() {
          var total = 3;
          var done = 0;
          if (bio.trim().isNotEmpty) done++;
          if (interests.isNotEmpty) done++;
          if (voiceBioUrl.trim().isNotEmpty) done++;
          return total == 0 ? 0.0 : done / total;
        })();
        final initials = displayName.trim().isNotEmpty ? displayName.trim()[0].toUpperCase() : 'U';

        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'My Profile',
                    style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
                  ),
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.of(context).pushNamed(NotificationsScreen.routeName),
                        icon: const Icon(Icons.notifications_outlined),
                        tooltip: 'Notifications',
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(context).pushNamed(SettingsScreen.routeName),
                        icon: const Icon(Icons.settings_outlined),
                        tooltip: 'Settings',
                      ),
                      OutlinedButton(
                        onPressed: () async {
                          final ok = await Navigator.of(context).pushNamed(
                            EditProfileScreen.routeName,
                            arguments: {
                              'mode': 'edit',
                              'profile': p,
                            },
                          );
                          if (ok == true) {
                            await _refresh();
                          }
                        },
                        child: const Text('Edit'),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: colorScheme.surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: colorScheme.outlineVariant),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 34,
                          backgroundColor: colorScheme.primary,
                          foregroundColor: colorScheme.onPrimary,
                          child: Text(
                            initials,
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                displayName,
                                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
                              ),
                              if (location.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(
                                  location,
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: colorScheme.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                    if (bio.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Text(
                        'About Me',
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        bio,
                        style: theme.textTheme.bodyMedium?.copyWith(height: 1.4),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Voice Bio',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: colorScheme.surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: colorScheme.outlineVariant),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Record a short audio introduction about yourself.',
                      style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        FilledButton.icon(
                          onPressed: _busyVoice ? null : _toggleRecord,
                          icon: Icon(_recording ? Icons.stop : Icons.mic),
                          label: Text(_recording ? 'Stop' : 'Record'),
                        ),
                        if (!_recording && _recordPath != null)
                          OutlinedButton.icon(
                            onPressed: _busyVoice ? null : _uploadRecordedVoiceBio,
                            icon: const Icon(Icons.save_outlined),
                            label: const Text('Save'),
                          ),
                        if (voiceBioUrl.trim().isNotEmpty)
                          OutlinedButton.icon(
                            onPressed: _busyVoice
                                ? null
                                : () async {
                                    if (_player.playing) {
                                      await _stopVoiceBio();
                                    } else {
                                      await _playVoiceBio(voiceBioUrl);
                                    }
                                  },
                            icon: Icon(_player.playing ? Icons.stop_circle_outlined : Icons.play_arrow),
                            label: Text(_player.playing ? 'Stop' : 'Play'),
                          ),
                        if (voiceBioUrl.trim().isNotEmpty)
                          OutlinedButton.icon(
                            onPressed: _busyVoice ? null : _deleteVoiceBio,
                            icon: const Icon(Icons.delete_outline),
                            label: const Text('Delete'),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Stats',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: colorScheme.surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: colorScheme.outlineVariant),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Profile completeness',
                            style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w800),
                          ),
                        ),
                        Text('${(completeness * 100).round()}%'),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: LinearProgressIndicator(
                        value: completeness,
                        minHeight: 10,
                        backgroundColor: colorScheme.surfaceContainerHighest,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text('Interests: ${interests.length}', style: theme.textTheme.bodyMedium),
                    Text(
                      'Voice bio: ${voiceBioUrl.trim().isNotEmpty ? 'Yes' : 'No'}',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Account',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: colorScheme.surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: colorScheme.outlineVariant),
                ),
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.verified_user_outlined),
                      title: const Text('KYC Verification'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.of(context).pushNamed(KycHomeScreen.routeName),
                    ),
                    Divider(height: 1, color: colorScheme.outlineVariant),
                    ListTile(
                      leading: const Icon(Icons.call_outlined),
                      title: const Text('Calls'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.of(context).pushNamed(CallHistoryScreen.routeName),
                    ),
                    Divider(height: 1, color: colorScheme.outlineVariant),
                    ListTile(
                      leading: const Icon(Icons.logout),
                      title: const Text('Logout'),
                      onTap: () async {
                        await Provider.of<AuthController>(context, listen: false).logout();
                        if (!context.mounted) return;
                        showToast(context, 'Logged out');
                        Navigator.of(context).pushNamedAndRemoveUntil('/', (r) => false);
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _NoProfileView extends StatelessWidget {
  const _NoProfileView({required this.onCreate});

  final Future<void> Function() onCreate;

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
              'Create your profile',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              'Complete your profile to unlock discovery and community features.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => onCreate(),
              child: const Text('Create profile'),
            ),
          ],
        ),
      ),
    );
  }
}
