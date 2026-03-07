import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:just_audio/just_audio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:url_launcher/url_launcher.dart';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';

import '../../core/api_client.dart';
import '../../core/app_localizations.dart';
import '../../core/config.dart';
import '../../core/socket_service.dart';
import '../../core/pagination.dart';
import '../../core/toast.dart';
import '../../models/chat_message.dart';
import '../calls/outgoing_call_screen.dart';
import '../profile/profile_service.dart';
import 'chats_service.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.conversationId, required this.participantName, required this.participantId});

  static const routeName = '/chats/chat';

  final String conversationId;
  final String participantName;
  final String participantId;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  static const _pollInterval = Duration(seconds: 20);

  late final ChatsService _service;
  late Future<Paginated<ChatMessage>> _future;

  StreamSubscription<Map<String, dynamic>>? _wsSub;
  Timer? _pollTimer;
  DateTime? _lastRefresh;
  bool _isFetching = false;

  String _myUserId = '';

  ValueNotifier<int>? _tabIndex;
  bool _wasActive = false;

  final _composerController = TextEditingController();
  bool _sending = false;

  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _speechReady = false;
  bool _listening = false;

  final AudioRecorder _recorder = AudioRecorder();
  bool _recording = false;
  String? _recordPath;

  final AudioPlayer _player = AudioPlayer();
  String? _playingUrl;
  bool _isPlaying = false;
  bool _isLoadingAudio = false;
  Duration _audioDuration = Duration.zero;
  Duration _audioPosition = Duration.zero;
  StreamSubscription<PlayerState>? _playerStateSub;
  StreamSubscription<Duration>? _positionSub;
  StreamSubscription<Duration?>? _durationSub;

  void _initAudioListeners() {
    _playerStateSub = _player.playerStateStream.listen((state) {
      if (!mounted) return;
      setState(() {
        _isPlaying = state.playing;
        _isLoadingAudio = state.processingState == ProcessingState.loading ||
            state.processingState == ProcessingState.buffering;
        if (state.processingState == ProcessingState.completed) {
          _playingUrl = null;
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

  Future<void> _togglePlayback(String url) async {
    if (_playingUrl == url) {
      if (_player.playing) {
        await _player.pause();
      } else {
        await _player.play();
      }
      return;
    }

    final api = Provider.of<ApiClient>(context, listen: false);
    final token = await api.readAccessToken();

    try {
      await _player.stop();
      _audioPosition = Duration.zero;
      _audioDuration = Duration.zero;
      _playingUrl = url;
      setState(() {});

      final headers = <String, String>{};
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }

      await _player.setAudioSource(
        AudioSource.uri(
          Uri.parse(url),
          headers: headers.isNotEmpty ? headers : null,
        ),
      );
      await _player.play();
    } catch (e) {
      debugPrint('[VoicePlayback] Error playing audio: $e');
      if (!mounted) return;
      showToast(context, context.l10n.phrase('Failed to play audio'));
      _playingUrl = null;
      setState(() {});
    }
  }

  String _formatDuration(Duration d) {
    final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  bool _isCurrentlyPlaying(String url) {
    return _playingUrl == url && _isPlaying;
  }

  String _weekdayLabel(DateTime dt) {
    switch (dt.weekday) {
      case DateTime.monday:
        return 'Mon';
      case DateTime.tuesday:
        return 'Tue';
      case DateTime.wednesday:
        return 'Wed';
      case DateTime.thursday:
        return 'Thu';
      case DateTime.friday:
        return 'Fri';
      case DateTime.saturday:
        return 'Sat';
      case DateTime.sunday:
        return 'Sun';
      default:
        return '';
    }

  }

  void _onTabChanged() {
    final idx = _tabIndex?.value;
    final isActive = idx == 1;
    if (isActive && !_wasActive && mounted) {
      _refresh();
    }
    _wasActive = isActive;
  }

  String _formatWhatsAppTimestamp(BuildContext context, DateTime? dt) {
    if (dt == null) return '';
    final local = dt.toLocal();
    final now = DateTime.now();

    bool isSameDay(DateTime a, DateTime b) {
      return a.year == b.year && a.month == b.month && a.day == b.day;
    }

    final localizations = MaterialLocalizations.of(context);
    final time = localizations.formatTimeOfDay(
      TimeOfDay.fromDateTime(local),
      alwaysUse24HourFormat: MediaQuery.of(context).alwaysUse24HourFormat,
    );

    if (isSameDay(local, now)) {
      return time;
    }

    final yesterday = now.subtract(const Duration(days: 1));
    if (isSameDay(local, yesterday)) {
      return 'Yesterday $time';
    }

    final ageDays = now.difference(DateTime(local.year, local.month, local.day)).inDays;
    if (ageDays >= 0 && ageDays < 7) {
      final weekday = _weekdayLabel(local);
      return '$weekday $time';
    }

    final date = localizations.formatShortDate(local);
    return '$date $time';
  }

  @override
  void initState() {
    super.initState();
    _service = ChatsService(Provider.of<ApiClient>(context, listen: false));
    _future = _service.getMessagesTyped(conversationId: widget.conversationId);
    _service.markAsRead(widget.conversationId).catchError((_) {});

    _tabIndex = Provider.of<ValueNotifier<int>>(context, listen: false);
    _wasActive = _tabIndex?.value == 1;
    _tabIndex?.addListener(_onTabChanged);

    final socket = Provider.of<SocketService>(context, listen: false);
    _wsSub = socket.onMessageReceived.listen((evt) {
      final convId = (evt['conversation_id'] ?? evt['conversationId'] ?? '').toString();
      if (convId.isEmpty || convId != widget.conversationId) return;
      if (!mounted) return;
      _refreshImmediate();
    });

    _pollTimer = Timer.periodic(_pollInterval, (_) {
      if (!mounted) return;
      _refreshIfNeeded();
    });

    _lastRefresh = DateTime.now();

    ProfileService(Provider.of<ApiClient>(context, listen: false)).getMyProfile().then((p) {
      final id = (p['user_id'] ?? p['userId'] ?? p['user']?['user_id'] ?? '').toString();
      if (!mounted) return;
      if (id.isNotEmpty) {
        setState(() => _myUserId = id);
      }
    }).catchError((_) {});

    _initAudioListeners();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _wsSub?.cancel();
    _playerStateSub?.cancel();
    _positionSub?.cancel();
    _durationSub?.cancel();
    _tabIndex?.removeListener(_onTabChanged);
    _composerController.dispose();
    if (_listening) {
      _speech.stop();
    }
    if (_recording) {
      _recorder.stop();
    }
    _player.dispose();
    super.dispose();
  }

  Future<void> _refreshIfNeeded() async {
    if (_isFetching) return;
    final now = DateTime.now();
    if (_lastRefresh != null && now.difference(_lastRefresh!) < _pollInterval) {
      return;
    }
    await _refreshImmediate();
  }

  Future<void> _refreshImmediate() async {
    if (_isFetching) return;
    await _doRefresh();
  }

  Future<void> _doRefresh() async {
    _isFetching = true;
    _lastRefresh = DateTime.now();

    setState(() {
      _future = _service.getMessagesTyped(conversationId: widget.conversationId);
    });

    try {
      await _future;
    } finally {
      _isFetching = false;
    }
  }

  Future<void> _forceRefresh() async {
    _isFetching = false;
    await _doRefresh();
  }

  Future<void> _refresh() async {
    await _refreshImmediate();
  }

  Future<void> _send() async {
    final text = _composerController.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await _service.sendMessage(recipientId: widget.participantId, content: text);
      _composerController.clear();
      await _forceRefresh();
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<bool> _ensureMicPermission() async {
    final mic = await Permission.microphone.request();
    if (!mic.isGranted) return false;

    final speech = await Permission.speech.request();
    if (!speech.isGranted) {
      // Dictation won't work without speech permission, but recording might.
      return true;
    }
    return true;
  }

  Future<void> _toggleDictation() async {
    if (_listening) {
      await _speech.stop();
      if (!mounted) return;
      setState(() => _listening = false);
      return;
    }

    final ok = await _ensureMicPermission();
    if (!ok) return;

    if (!_speechReady) {
      _speechReady = await _speech.initialize();
    }
    if (!_speechReady) return;

    setState(() => _listening = true);
    await _speech.listen(
      onResult: (result) {
        final words = result.recognizedWords;
        if (words.trim().isEmpty) return;
        _composerController.text = words;
        _composerController.selection = TextSelection.fromPosition(
          TextPosition(offset: _composerController.text.length),
        );
      },
    );
  }

  Future<void> _pickAndSendAttachment() async {
    if (_sending) return;
    final res = await FilePicker.platform.pickFiles(withData: false);
    if (res == null || res.files.isEmpty) return;

    final f = res.files.first;
    final path = f.path;
    if (path == null || path.isEmpty) return;

    setState(() => _sending = true);
    try {
      final uploaded = await _service.uploadAttachment(
        filePath: path,
        filename: f.name,
      );
      final attachmentId = (uploaded['attachment_id'] ?? uploaded['attachmentId'] ?? '').toString();
      if (attachmentId.isEmpty) return;

      final mime = (uploaded['file_type'] ?? uploaded['fileType'] ?? '').toString();
      final lowerName = f.name.toLowerCase();
      final isImage = mime.startsWith('image/') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png') || lowerName.endsWith('.webp') || lowerName.endsWith('.gif');

      await _service.sendMessage(
        recipientId: widget.participantId,
        content: f.name,
        messageType: isImage ? 'IMAGE' : 'FILE',
        attachmentIds: [attachmentId],
      );
      await _forceRefresh();
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _toggleVoiceNote() async {
    final ok = await _ensureMicPermission();
    if (!ok) return;

    if (_recording) {
      String? stoppedPath;
      try {
        stoppedPath = await _recorder.stop();
      } on MissingPluginException {
        if (!mounted) return;
        showToast(context, context.l10n.recordingUnavailable, isError: true);
        setState(() => _recording = false);
        return;
      }
      if (!mounted) return;
      setState(() => _recording = false);

      final path = stoppedPath ?? _recordPath;
      if (path == null || path.isEmpty) return;

      setState(() => _sending = true);
      try {
        final name = path.split(Platform.pathSeparator).last;
        final uploaded = await _service.uploadAttachment(
          filePath: path,
          filename: name,
          mimeType: 'audio/m4a',
        );
        final attachmentId = (uploaded['attachment_id'] ?? uploaded['attachmentId'] ?? '').toString();
        if (attachmentId.isEmpty) return;

        await _service.sendMessage(
          recipientId: widget.participantId,
          content: 'Voice message',
          messageType: 'VOICE',
          attachmentIds: [attachmentId],
        );
        await _forceRefresh();
      } finally {
        if (mounted) setState(() => _sending = false);
      }
      return;
    }

    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/voice-${DateTime.now().millisecondsSinceEpoch}.m4a');
    _recordPath = file.path;

    try {
      await _recorder.start(
        const RecordConfig(),
        path: file.path,
      );
    } on MissingPluginException {
      if (!mounted) return;
      showToast(context, context.l10n.recordingUnavailableAfterPubGet, isError: true);
      return;
    }
    if (!mounted) return;
    setState(() => _recording = true);
  }

  String _absoluteUrl(String fileUrl) {
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl;
    final base = AppConfig.apiBaseUrl;
    final idx = base.indexOf('/api/');
    final origin = idx == -1 ? base : base.substring(0, idx);
    return '$origin$fileUrl';
  }

  Future<void> _openAttachment(ChatAttachment a) async {
    final url = _absoluteUrl(a.fileUrl);
    if (a.fileType.startsWith('image/')) {
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) {
          return Dialog(
            insetPadding: const EdgeInsets.all(16),
            child: InteractiveViewer(
              child: Image.network(url, fit: BoxFit.contain),
            ),
          );
        },
      );
      return;
    }

    if (a.fileType.startsWith('audio/')) {
      await _togglePlayback(url);
      return;
    }

    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  Widget _buildVoiceMessagePlayer(ChatAttachment a, Color textColor, Color bubbleColor) {
    final url = _absoluteUrl(a.fileUrl);
    final isThisPlaying = _playingUrl == url;
    final isPlaying = isThisPlaying && _isPlaying;
    final isLoading = isThisPlaying && _isLoadingAudio;

    final progress = isThisPlaying && _audioDuration.inMilliseconds > 0
        ? _audioPosition.inMilliseconds / _audioDuration.inMilliseconds
        : 0.0;

    final durationText = isThisPlaying && _audioDuration.inMilliseconds > 0
        ? '${_formatDuration(_audioPosition)} / ${_formatDuration(_audioDuration)}'
        : 'Voice message';

    return Container(
      constraints: const BoxConstraints(minWidth: 180, maxWidth: 240),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: bubbleColor.withAlpha((bubbleColor.alpha * 0.7).round()),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: isLoading ? null : () => _togglePlayback(url),
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: textColor.withAlpha(50),
                shape: BoxShape.circle,
              ),
              child: isLoading
                  ? Padding(
                      padding: const EdgeInsets.all(10),
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: textColor,
                      ),
                    )
                  : Icon(
                      isPlaying ? Icons.pause : Icons.play_arrow,
                      color: textColor,
                      size: 24,
                    ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress.clamp(0.0, 1.0),
                    backgroundColor: textColor.withAlpha(40),
                    valueColor: AlwaysStoppedAnimation<Color>(textColor.withAlpha(180)),
                    minHeight: 4,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  durationText,
                  style: TextStyle(
                    color: textColor.withAlpha(200),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showMessageActions(ChatMessage m) async {
    if (!m.isMine || m.isDeleted) return;

    final action = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.edit),
                title: Text(context.l10n.phrase('Edit message')),
                onTap: () => Navigator.of(context).pop('edit'),
              ),
              ListTile(
                leading: const Icon(Icons.delete_outline),
                title: Text(context.l10n.phrase('Delete message')),
                onTap: () => Navigator.of(context).pop('delete'),
              ),
            ],
          ),
        );
      },
    );

    if (action == 'edit') {
      final controller = TextEditingController(text: m.content);
      final updated = await showDialog<String>(
        context: context,
        builder: (context) {
          return AlertDialog(
            title: Text(context.l10n.phrase('Edit message')),
            content: TextField(
              controller: controller,
              autofocus: true,
              minLines: 1,
              maxLines: 4,
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text(context.l10n.cancel),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(controller.text.trim()),
                child: Text(context.l10n.save),
              ),
            ],
          );
        },
      );
      if (updated == null || updated.isEmpty) return;

      await _service.editMessage(messageId: m.messageId, content: updated);
      await _forceRefresh();
    }

    if (action == 'delete') {
      await _service.deleteMessage(messageId: m.messageId);
      await _forceRefresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.participantName),
        actions: [
          IconButton(
            onPressed: widget.participantId.trim().isEmpty
                ? null
                : () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => OutgoingCallScreen(
                          receiverId: widget.participantId,
                          receiverName: widget.participantName,
                        ),
                      ),
                    );
                  },
            icon: const Icon(Icons.call),
            tooltip: l10n.phrase('Call'),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: FutureBuilder<Paginated<ChatMessage>>(
                future: _future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    final err = snapshot.error;
                    final isUnauthorized = err is DioException && err.response?.statusCode == 401;
                    if (isUnauthorized) {
                      return Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                l10n.phrase('Session expired'),
                                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 12),
                              FilledButton(
                                onPressed: () {
                                  Navigator.of(context).pushNamedAndRemoveUntil('/', (r) => false);
                                },
                                child: Text(l10n.phrase('Login again')),
                              ),
                            ],
                          ),
                        ),
                      );
                    }
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              l10n.phrase('Failed to load messages'),
                              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 12),
                            FilledButton(
                              onPressed: _refresh,
                              child: Text(l10n.retry),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  final items = snapshot.data?.items ?? const <ChatMessage>[];
                  final messages = items.reversed.toList(growable: false);

                  if (messages.isEmpty) {
                    return Center(
                      child: Text(
                        l10n.phrase('No messages yet'),
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: _refresh,
                    child: ListView.builder(
                      reverse: true,
                      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                      itemCount: messages.length,
                      itemBuilder: (context, index) {
                        final m = messages[index];
                        final content = m.content;
                        final isMine = (_myUserId.isNotEmpty && m.senderId == _myUserId) || m.isMine;
                        final timestamp = _formatWhatsAppTimestamp(context, m.createdAt);
                        final bubbleColor = isMine
                            ? theme.colorScheme.primary
                            : theme.colorScheme.surfaceContainerHighest;
                        final textColor = isMine
                            ? theme.colorScheme.onPrimary
                            : theme.colorScheme.onSurface;

                        final attachments = m.attachments;
                        final hasAttachments = attachments.isNotEmpty;

                        return Align(
                          alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
                          child: Semantics(
                            button: isMine && !m.isDeleted,
                            label: isMine && !m.isDeleted ? 'Message. Double tap and hold for actions.' : 'Message',
                            child: GestureDetector(
                              onLongPress: () => _showMessageActions(m),
                              child: Container(
                                margin: const EdgeInsets.symmetric(vertical: 4),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                constraints: const BoxConstraints(maxWidth: 320),
                                decoration: BoxDecoration(
                                  color: bubbleColor,
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      m.isDeleted ? 'Message deleted' : content,
                                      style: theme.textTheme.bodyMedium?.copyWith(
                                        color: textColor,
                                        fontStyle: m.isDeleted ? FontStyle.italic : FontStyle.normal,
                                      ),
                                    ),
                                    if (timestamp.isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Align(
                                        alignment: Alignment.centerRight,
                                        child: Text(
                                          timestamp,
                                          style: theme.textTheme.labelSmall?.copyWith(
                                            color: textColor.withOpacity(0.8),
                                          ),
                                        ),
                                      ),
                                    ],
                                    if (m.editedAt != null && !m.isDeleted) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        'Edited',
                                        style: theme.textTheme.labelSmall?.copyWith(color: textColor.withOpacity(0.85)),
                                      ),
                                    ],
                                    if (hasAttachments) ...[
                                      const SizedBox(height: 8),
                                      for (final a in attachments)
                                        Padding(
                                          padding: const EdgeInsets.only(bottom: 6),
                                          child: a.fileType.startsWith('audio/')
                                              ? _buildVoiceMessagePlayer(a, textColor, bubbleColor)
                                              : InkWell(
                                                  onTap: () => _openAttachment(a),
                                                  child: Row(
                                                    mainAxisSize: MainAxisSize.min,
                                                    children: [
                                                      Icon(
                                                        a.fileType.startsWith('image/')
                                                            ? Icons.image_outlined
                                                            : Icons.attach_file,
                                                        size: 18,
                                                        color: textColor,
                                                      ),
                                                      const SizedBox(width: 6),
                                                      Flexible(
                                                        child: Text(
                                                          a.fileName,
                                                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: textColor),
                                                          maxLines: 1,
                                                          overflow: TextOverflow.ellipsis,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                        ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  );
                },
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                border: Border(
                  top: BorderSide(color: theme.colorScheme.outlineVariant),
                ),
              ),
              child: Row(
                children: [
                  IconButton(
                    onPressed: _sending ? null : _pickAndSendAttachment,
                    icon: const Icon(Icons.attach_file),
                    tooltip: l10n.phrase('Attach file'),
                  ),
                  Expanded(
                    child: TextField(
                      controller: _composerController,
                      maxLines: 1,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration: InputDecoration(
                        hintText: l10n.phrase('Message'),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: _sending ? null : _toggleDictation,
                    icon: Icon(_listening ? Icons.mic : Icons.mic_none),
                    tooltip: _listening
                        ? l10n.phrase('Stop dictation')
                        : l10n.phrase('Dictate message'),
                  ),
                  IconButton(
                    onPressed: _sending ? null : _toggleVoiceNote,
                    icon: Icon(_recording ? Icons.stop_circle_outlined : Icons.mic_outlined),
                    tooltip: _recording
                        ? l10n.phrase('Stop recording')
                        : l10n.phrase('Record voice note'),
                  ),
                  IconButton.filled(
                    onPressed: _sending ? null : _send,
                    icon: const Icon(Icons.send),
                    tooltip: l10n.phrase('Send'),
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
