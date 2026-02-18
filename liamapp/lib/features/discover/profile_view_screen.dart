import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:just_audio/just_audio.dart';

import '../../core/api_client.dart';
import '../../core/config.dart';
import '../profile/profile_service.dart';
import 'discover_service.dart';

class ProfileViewScreen extends StatefulWidget {
  const ProfileViewScreen({super.key, required this.userId, required this.displayName});

  static const routeName = '/discover/profile';

  final String userId;
  final String displayName;

  @override
  State<ProfileViewScreen> createState() => _ProfileViewScreenState();
}

class _ProfileViewScreenState extends State<ProfileViewScreen> {
  late final ProfileService _profileService;
  late final DiscoverService _discoverService;
  late Future<Map<String, dynamic>> _future;

  bool _liking = false;

  final AudioPlayer _player = AudioPlayer();
  bool _busyVoice = false;

  @override
  void initState() {
    super.initState();
    final apiClient = Provider.of<ApiClient>(context, listen: false);
    _profileService = ProfileService(apiClient);
    _discoverService = DiscoverService(apiClient);
    _future = _profileService.getProfile(userId: widget.userId);
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    setState(() {
      _future = _profileService.getProfile(userId: widget.userId);
    });
    await _future;
  }

  String _displayNameFromProfile(Map<String, dynamic> p) {
    final user = p['user'] as dynamic;
    final first = (user?['first_name'] ?? user?['firstName'] ?? p['first_name'] ?? p['firstName'] ?? '').toString();
    final last = (user?['last_name'] ?? user?['lastName'] ?? p['last_name'] ?? p['lastName'] ?? '').toString();
    final dn = (p['display_name'] ?? p['displayName'] ?? '').toString();
    final name = ([first, last].where((x) => x.trim().isNotEmpty).join(' ')).trim();
    final fallback = widget.displayName.trim().isNotEmpty ? widget.displayName.trim() : 'User';
    return dn.isNotEmpty ? dn : (name.isNotEmpty ? name : fallback);
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList(growable: false);
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0].substring(0, 1).toUpperCase();
    return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
  }

  String _absoluteUrl(String fileUrl) {
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl;
    final base = AppConfig.apiBaseUrl;
    final idx = base.indexOf('/api/');
    final origin = idx == -1 ? base : base.substring(0, idx);
    return '$origin$fileUrl';
  }

  Future<void> _playVoiceBio(String url) async {
    if (_busyVoice) return;
    setState(() => _busyVoice = true);
    try {
      await _player.setUrl(_absoluteUrl(url));
      await _player.play();
      if (!mounted) return;
      setState(() {});
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to play voice bio: $e')),
      );
    } finally {
      if (mounted) setState(() => _busyVoice = false);
    }
  }

  Future<void> _stopVoiceBio() async {
    await _player.stop();
    if (!mounted) return;
    setState(() {});
  }

  Future<void> _like() async {
    if (_liking || widget.userId.trim().isEmpty) return;
    setState(() => _liking = true);
    try {
      final resp = await _discoverService.likeProfile(widget.userId);
      if (!mounted) return;
      final isMatch = resp['isMatch'] == true;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(isMatch ? 'It\'s a match!' : 'Liked')),
      );
      await _refresh();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to like: $e')),
      );
    } finally {
      if (mounted) setState(() => _liking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.displayName.trim().isEmpty ? 'Profile' : widget.displayName),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: FutureBuilder<Map<String, dynamic>>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(24),
                  children: [
                    Text(
                      'Failed to load profile',
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    FilledButton(onPressed: _refresh, child: const Text('Retry')),
                  ],
                );
              }

              final p = snapshot.data ?? const <String, dynamic>{};
              final colorScheme = theme.colorScheme;

              final name = _displayNameFromProfile(p);
              final location = (p['location'] ?? '').toString();
              final bio = (p['bio'] ?? '').toString();
              final voiceBioUrl = (p['voice_bio_url'] ?? p['voiceBioUrl'] ?? '').toString();
              final interests = (p['interests'] is List
                  ? (p['interests'] as List).whereType<String>().toList(growable: false)
                  : const <String>[]);

              final completeness = (() {
                var total = 3;
                var done = 0;
                if (bio.trim().isNotEmpty) done++;
                if (interests.isNotEmpty) done++;
                if (voiceBioUrl.trim().isNotEmpty) done++;
                return total == 0 ? 0.0 : done / total;
              })();

              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
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
                                _initials(name),
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    name,
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
                            'About',
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
                          voiceBioUrl.trim().isNotEmpty
                              ? 'Listen to this user\'s voice introduction.'
                              : 'No voice bio available.',
                          style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                        ),
                        if (voiceBioUrl.trim().isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 10,
                            runSpacing: 10,
                            children: [
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
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Interests',
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
                    child: interests.isEmpty
                        ? Text(
                            'No interests provided.',
                            style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                          )
                        : Wrap(
                            spacing: 10,
                            runSpacing: 10,
                            children: interests
                                .map(
                                  (i) => Chip(
                                    label: Text(i),
                                    backgroundColor: colorScheme.surfaceContainerHighest,
                                  ),
                                )
                                .toList(growable: false),
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
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _liking ? null : _like,
                      child: Text(_liking ? 'Liking...' : 'Like'),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
