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
import '../../core/config.dart';
import '../../core/socket_service.dart';
import '../../core/pagination.dart';
import '../../models/chat_message.dart';
import '../calls/calls_service.dart';
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
  late final ChatsService _service;
  late Future<Paginated<ChatMessage>> _future;

  StreamSubscription<Map<String, dynamic>>? _wsSub;

  String _myUserId = '';

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

  @override
  void initState() {
    super.initState();
    _service = ChatsService(Provider.of<ApiClient>(context, listen: false));
    _future = _service.getMessagesTyped(conversationId: widget.conversationId);
    _service.markAsRead(widget.conversationId).catchError((_) {});

    final socket = Provider.of<SocketService>(context, listen: false);
    _wsSub = socket.onMessageReceived.listen((evt) {
      final convId = (evt['conversation_id'] ?? evt['conversationId'] ?? '').toString();
      if (convId.isEmpty || convId != widget.conversationId) return;
      if (!mounted) return;
      _refresh();
    });

    ProfileService(Provider.of<ApiClient>(context, listen: false)).getMyProfile().then((p) {
      final id = (p['user_id'] ?? p['userId'] ?? p['user']?['user_id'] ?? '').toString();
      if (!mounted) return;
      if (id.isNotEmpty) {
        setState(() => _myUserId = id);
      }
    }).catchError((_) {});
  }

  @override
  void dispose() {
    _wsSub?.cancel();
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

  Future<void> _refresh() async {
    setState(() {
      _future = _service.getMessagesTyped(conversationId: widget.conversationId);
    });
    await _future;
  }

  Future<void> _send() async {
    final text = _composerController.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await _service.sendMessage(recipientId: widget.participantId, content: text);
      _composerController.clear();
      await _refresh();
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
      await _refresh();
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
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Voice recording is not available on this build.')),
        );
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
        await _refresh();
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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Voice recording is not available on this build. Please fully restart the app after flutter pub get.')),
      );
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

    final uri = Uri.parse(url);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
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

    await _player.stop();
    await _player.setUrl(url);
    _playingUrl = url;
    await _player.play();
    if (!mounted) return;
    setState(() {});
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
                title: const Text('Edit message'),
                onTap: () => Navigator.of(context).pop('edit'),
              ),
              ListTile(
                leading: const Icon(Icons.delete_outline),
                title: const Text('Delete message'),
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
            title: const Text('Edit message'),
            content: TextField(
              controller: controller,
              autofocus: true,
              minLines: 1,
              maxLines: 4,
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(controller.text.trim()),
                child: const Text('Save'),
              ),
            ],
          );
        },
      );
      if (updated == null || updated.isEmpty) return;

      await _service.editMessage(messageId: m.messageId, content: updated);
      await _refresh();
    }

    if (action == 'delete') {
      await _service.deleteMessage(messageId: m.messageId);
      await _refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.participantName),
        actions: [
          IconButton(
            onPressed: widget.participantId.trim().isEmpty
                ? null
                : () async {
                    final calls = CallsService(Provider.of<ApiClient>(context, listen: false));
                    final initiated = await calls.initiate(receiverId: widget.participantId);
                    final callId = (initiated['call_id'] ?? initiated['callId'] ?? initiated['id'] ?? '').toString();
                    if (!context.mounted) return;
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => OutgoingCallScreen(
                          callId: callId,
                          receiverId: widget.participantId,
                          receiverName: widget.participantName,
                        ),
                      ),
                    );
                  },
            icon: const Icon(Icons.call),
            tooltip: 'Call',
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
                                'Session expired',
                                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 12),
                              FilledButton(
                                onPressed: () {
                                  Navigator.of(context).pushNamedAndRemoveUntil('/', (r) => false);
                                },
                                child: const Text('Login again'),
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
                              'Failed to load messages',
                              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 12),
                            FilledButton(
                              onPressed: _refresh,
                              child: const Text('Retry'),
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
                        'No messages yet',
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
                                          child: InkWell(
                                            onTap: () => _openAttachment(a),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(
                                                  a.fileType.startsWith('image/')
                                                      ? Icons.image_outlined
                                                      : (a.fileType.startsWith('audio/') ? Icons.play_arrow : Icons.attach_file),
                                                  size: 18,
                                                  color: textColor,
                                                ),
                                                const SizedBox(width: 6),
                                                Flexible(
                                                  child: Text(
                                                    a.fileName,
                                                    style: theme.textTheme.bodySmall?.copyWith(color: textColor),
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
                    tooltip: 'Attach file',
                  ),
                  Expanded(
                    child: TextField(
                      controller: _composerController,
                      maxLines: 1,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration: const InputDecoration(
                        hintText: 'Message',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: _sending ? null : _toggleDictation,
                    icon: Icon(_listening ? Icons.mic : Icons.mic_none),
                    tooltip: _listening ? 'Stop dictation' : 'Dictate message',
                  ),
                  IconButton(
                    onPressed: _sending ? null : _toggleVoiceNote,
                    icon: Icon(_recording ? Icons.stop_circle_outlined : Icons.mic_outlined),
                    tooltip: _recording ? 'Stop recording' : 'Record voice note',
                  ),
                  IconButton.filled(
                    onPressed: _sending ? null : _send,
                    icon: const Icon(Icons.send),
                    tooltip: 'Send',
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
