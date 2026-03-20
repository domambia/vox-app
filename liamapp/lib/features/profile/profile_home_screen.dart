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
import '../../core/app_localizations.dart';
import '../../core/config.dart';
import '../../core/refresh_manager.dart';
import '../../core/toast.dart';
import '../auth/auth_controller.dart';
import '../calls/call_history_screen.dart';
import '../kyc/kyc_home_screen.dart';
import 'edit_profile_screen.dart';
import 'notifications_screen.dart';
import 'profile_service.dart';
import '../settings/settings_controller.dart';
import 'settings_screen.dart';

class ProfileHomeScreen extends StatefulWidget {
  const ProfileHomeScreen({super.key});

  static const routeName = '/profile';

  @override
  State<ProfileHomeScreen> createState() => _ProfileHomeScreenState();
}

class _ProfileHomeScreenState extends State<ProfileHomeScreen> {
  static const _refreshKey = 'profile';
  static const _pollInterval = Duration(seconds: 60);

  late final ProfileService _service;
  late Future<Map<String, dynamic>> _future;
  final _refreshManager = RefreshManager();

  Timer? _pollTimer;
  final AudioPlayer _player = AudioPlayer();
  final AudioRecorder _recorder = AudioRecorder();
  bool _recording = false;
  bool _busyVoice = false;
  String? _recordPath;

  bool _isPlaying = false;
  bool _isLoadingAudio = false;
  Duration _audioDuration = Duration.zero;
  Duration _audioPosition = Duration.zero;
  StreamSubscription<PlayerState>? _playerStateSub;
  StreamSubscription<Duration>? _positionSub;
  StreamSubscription<Duration?>? _durationSub;
  Timer? _recordingTimer;
  int _recordingSeconds = 0;

  ValueNotifier<int>? _tabIndex;
  bool _isActive = false;

  @override
  void initState() {
    super.initState();
    _service = ProfileService(Provider.of<ApiClient>(context, listen: false));
    _future = _service.getMyProfile();
    _refreshManager.markFetchCompleted(_refreshKey);

    _tabIndex = Provider.of<ValueNotifier<int>>(context, listen: false);
    _isActive = _tabIndex?.value == 4;
    _tabIndex?.addListener(_onTabChanged);

    _initAudioListeners();
    _startPolling();
  }

  void _initAudioListeners() {
    _playerStateSub = _player.playerStateStream.listen((state) {
      if (!mounted) return;
      setState(() {
        _isPlaying = state.playing;
        _isLoadingAudio = state.processingState == ProcessingState.loading ||
            state.processingState == ProcessingState.buffering;
        if (state.processingState == ProcessingState.completed) {
          _audioPosition = Duration.zero;
          _isLoadingAudio = false;
        }
      });
    });

    _positionSub = _player.positionStream.listen((position) {
      if (!mounted) return;
      setState(() => _audioPosition = position);
    });

    _durationSub = _player.durationStream.listen((duration) {
      if (!mounted) return;
      setState(() => _audioDuration = duration ?? Duration.zero);
    });
  }

  String _formatDuration(Duration d) {
    final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
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
    final nowActive = idx == 4;
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
    _recordingTimer?.cancel();
    _playerStateSub?.cancel();
    _positionSub?.cancel();
    _durationSub?.cancel();
    _tabIndex?.removeListener(_onTabChanged);
    _player.dispose();
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    if (!_refreshManager.canFetch(_refreshKey)) return;
    _refreshManager.markFetchStarted(_refreshKey);

    setState(() {
      _future = _service.getMyProfile();
    });

    try {
      await _future;
    } finally {
      _refreshManager.markFetchCompleted(_refreshKey);
    }
  }

  String _profileDisplayName(Map<String, dynamic> p) {
    final user = p['user'] as dynamic;
    final first = (user?['first_name'] ?? user?['firstName'] ?? p['first_name'] ?? p['firstName'] ?? '').toString();
    final last = (user?['last_name'] ?? user?['lastName'] ?? p['last_name'] ?? p['lastName'] ?? '').toString();
    final fullName = ([first, last].where((x) => x.trim().isNotEmpty).join(' ')).trim();
    final explicitDisplayName = (p['display_name'] ?? p['displayName'] ?? '').toString().trim();
    return explicitDisplayName.isNotEmpty
        ? explicitDisplayName
        : (fullName.isNotEmpty ? fullName : context.l10n.phrase('User'));
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
      showToast(context, context.l10n.micPermissionRequired, isError: true);
      return;
    }

    if (_recording) {
      setState(() => _busyVoice = true);
      _recordingTimer?.cancel();
      String? stoppedPath;
      try {
        stoppedPath = await _recorder.stop();
      } on MissingPluginException {
        if (!mounted) return;
        showToast(context, context.l10n.recordingUnavailable, isError: true);
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
      showToast(context, context.l10n.recordingUnavailableAfterPubGet, isError: true);
      return;
    }
    if (!mounted) return;
    setState(() {
      _recording = true;
      _recordingSeconds = 0;
    });
    _recordingTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _recordingSeconds++);
    });
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
      showToast(context, context.l10n.voiceBioSaved);
    } on DioException catch (e) {
      if (!mounted) return;
      showToast(context, messageFromDioException(e), isError: true);
    } finally {
      if (mounted) setState(() => _busyVoice = false);
    }
  }

  Future<void> _togglePlayVoiceBio(String url) async {
    if (_isPlaying) {
      await _player.pause();
      return;
    }

    final fullUrl = _absoluteUrl(url);
    
    try {
      setState(() => _isLoadingAudio = true);
      _audioPosition = Duration.zero;
      _audioDuration = Duration.zero;

      final api = Provider.of<ApiClient>(context, listen: false);
      final token = await api.readAccessToken();

      final headers = <String, String>{};
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }

      await _player.setAudioSource(
        AudioSource.uri(
          Uri.parse(fullUrl),
          headers: headers.isNotEmpty ? headers : null,
        ),
      );
      await _player.play();
    } catch (e) {
      debugPrint('[VoiceBio] Error playing audio: $e');
      if (!mounted) return;
      showToast(context, context.l10n.failedToPlayVoiceBio, isError: true);
      setState(() => _isLoadingAudio = false);
    }
  }

  Future<void> _deleteVoiceBio() async {
    if (_busyVoice) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(context.l10n.deleteVoiceBioTitle),
        content: Text(context.l10n.deleteVoiceBioBody),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(context.l10n.cancel)),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: Text(context.l10n.delete)),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _busyVoice = true);
    try {
      await _service.deleteVoiceBio();
      await _refresh();
      if (!mounted) return;
      showToast(context, context.l10n.voiceBioDeleted);
    } finally {
      if (mounted) setState(() => _busyVoice = false);
    }
  }

  Widget _buildRecordingWidget(ThemeData theme, ColorScheme colorScheme) {
    return Column(
      children: [
        Row(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: colorScheme.error,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: colorScheme.error.withAlpha(100),
                    blurRadius: 12,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: const Icon(Icons.mic, color: Colors.white, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.l10n.recording,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: colorScheme.error,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatDuration(Duration(seconds: _recordingSeconds)),
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: _busyVoice ? null : _toggleRecord,
            style: FilledButton.styleFrom(
              backgroundColor: colorScheme.error,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            icon: const Icon(Icons.stop),
            label: Text(context.l10n.stopRecording),
          ),
        ),
      ],
    );
  }

  Widget _buildVoiceBioPlayer(String url, ThemeData theme, ColorScheme colorScheme) {
    final progress = _audioDuration.inMilliseconds > 0
        ? _audioPosition.inMilliseconds / _audioDuration.inMilliseconds
        : 0.0;

    return Column(
      children: [
        Row(
          children: [
            GestureDetector(
              onTap: _isLoadingAudio ? null : () => _togglePlayVoiceBio(url),
              child: Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: colorScheme.primary,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: colorScheme.primary.withAlpha(80),
                      blurRadius: 10,
                      spreadRadius: 1,
                    ),
                  ],
                ),
                child: _isLoadingAudio
                    ? const Padding(
                        padding: EdgeInsets.all(18),
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.white,
                        ),
                      )
                    : Icon(
                        _isPlaying ? Icons.pause : Icons.play_arrow,
                        color: Colors.white,
                        size: 32,
                      ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.l10n.yourVoiceBio,
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: progress.clamp(0.0, 1.0),
                      backgroundColor: colorScheme.outlineVariant,
                      minHeight: 6,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _audioDuration.inMilliseconds > 0
                        ? '${_formatDuration(_audioPosition)} / ${_formatDuration(_audioDuration)}'
                        : context.l10n.tapToPlay,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _busyVoice ? null : _toggleRecord,
                icon: const Icon(Icons.mic),
                label: Text(context.l10n.rerecord),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _busyVoice ? null : _deleteVoiceBio,
                style: OutlinedButton.styleFrom(
                  foregroundColor: colorScheme.error,
                ),
                icon: const Icon(Icons.delete_outline),
                label: Text(context.l10n.delete),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildRecordedPreview(ThemeData theme, ColorScheme colorScheme) {
    return Column(
      children: [
        Row(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: colorScheme.secondary,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.audiotrack, color: Colors.white, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.l10n.recordingReady,
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    context.l10n.saveToUpdateVoiceBio,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _busyVoice ? null : _toggleRecord,
                icon: const Icon(Icons.mic),
                label: Text(context.l10n.rerecord),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton.icon(
                onPressed: _busyVoice ? null : _uploadRecordedVoiceBio,
                icon: _busyVoice 
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.save),
                label: Text(context.l10n.save),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildEmptyVoiceBio(ThemeData theme, ColorScheme colorScheme) {
    return Column(
      children: [
        Row(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHighest,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.mic_none, color: colorScheme.onSurfaceVariant, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.l10n.noVoiceBioYet,
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    context.l10n.recordVoiceBioHint,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: _busyVoice ? null : _toggleRecord,
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            icon: const Icon(Icons.mic),
            label: Text(context.l10n.startRecording),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final l10n = context.l10n;
    final settings = Provider.of<SettingsController>(context, listen: true);

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
                    l10n.failedToLoadProfile,
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(onPressed: _refresh, child: Text(l10n.retry)),
                ],
              ),
            ),
          );
        }

        final p = snapshot.data ?? const <String, dynamic>{};
        final displayName = _profileDisplayName(p);
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
                    l10n.myProfile,
                    style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
                  ),
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.of(context).pushNamed(NotificationsScreen.routeName),
                        icon: const Icon(Icons.notifications_outlined),
                        tooltip: l10n.notifications,
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(context).pushNamed(SettingsScreen.routeName),
                        icon: const Icon(Icons.settings_outlined),
                        tooltip: l10n.settings,
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
                        child: Text(l10n.edit),
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
                        l10n.aboutMe,
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
              const SizedBox(height: 20),
              Row(
                children: [
                  Icon(Icons.mic, color: colorScheme.primary, size: 22),
                  const SizedBox(width: 8),
                  Text(
                    l10n.voiceBio,
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      colorScheme.primaryContainer.withAlpha(80),
                      colorScheme.surface,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: colorScheme.outlineVariant.withAlpha(120)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_recording) ...[
                      _buildRecordingWidget(theme, colorScheme),
                    ] else if (voiceBioUrl.trim().isNotEmpty) ...[
                      _buildVoiceBioPlayer(voiceBioUrl, theme, colorScheme),
                    ] else if (_recordPath != null) ...[
                      _buildRecordedPreview(theme, colorScheme),
                    ] else ...[
                      _buildEmptyVoiceBio(theme, colorScheme),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                l10n.stats,
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
                            l10n.profileCompleteness,
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
                    Text(l10n.interestsCount(interests.length), style: theme.textTheme.bodyMedium),
                    Text(
                      l10n.voiceBioStatus(voiceBioUrl.trim().isNotEmpty),
                      style: theme.textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                l10n.account,
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
                      leading: const Icon(Icons.language_outlined),
                      title: Text(l10n.language),
                      trailing: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: settings.language.languageCode,
                          items: [
                            DropdownMenuItem(value: 'en', child: Text(l10n.english)),
                            DropdownMenuItem(value: 'it', child: Text(l10n.italian)),
                            DropdownMenuItem(value: 'mt', child: Text(l10n.maltese)),
                          ],
                          onChanged: (value) {
                            if (value == null) return;
                            settings.updateLanguageCode(value);
                          },
                        ),
                      ),
                    ),
                    Divider(height: 1, color: colorScheme.outlineVariant),
                    ListTile(
                      leading: const Icon(Icons.verified_user_outlined),
                      title: Text(l10n.kycVerification),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.of(context).pushNamed(KycHomeScreen.routeName),
                    ),
                    Divider(height: 1, color: colorScheme.outlineVariant),
                    ListTile(
                      leading: const Icon(Icons.call_outlined),
                      title: Text(l10n.calls),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.of(context).pushNamed(CallHistoryScreen.routeName),
                    ),
                    Divider(height: 1, color: colorScheme.outlineVariant),
                    ListTile(
                      leading: const Icon(Icons.logout),
                      title: Text(l10n.logout),
                      onTap: () async {
                        await Provider.of<AuthController>(context, listen: false).logout();
                        if (!context.mounted) return;
                        showToast(context, l10n.loggedOut);
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
              context.l10n.createYourProfile,
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              context.l10n.completeProfileHint,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => onCreate(),
              child: Text(context.l10n.createProfile),
            ),
          ],
        ),
      ),
    );
  }
}
