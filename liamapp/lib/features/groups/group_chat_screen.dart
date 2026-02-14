import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import 'package:record/record.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/config.dart';
import '../../core/pagination.dart';
import '../../models/group_message.dart';
import '../profile/profile_service.dart';
import 'groups_service.dart';

class GroupChatScreen extends StatefulWidget {
  const GroupChatScreen({super.key, required this.groupId, required this.groupName});

  static const routeName = '/groups/chat';

  final String groupId;
  final String groupName;

  @override
  State<GroupChatScreen> createState() => _GroupChatScreenState();
}

class _GroupChatScreenState extends State<GroupChatScreen> {
  late final GroupsService _service;
  late Future<Paginated<GroupMessage>> _future;

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
    _service = GroupsService(Provider.of<ApiClient>(context, listen: false));
    _future = _service.getGroupMessagesTyped(groupId: widget.groupId);

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
      _future = _service.getGroupMessagesTyped(groupId: widget.groupId);
    });
    await _future;
  }

  Future<void> _send() async {
    final text = _composerController.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await _service.sendGroupMessage(groupId: widget.groupId, content: text);
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
      final uploaded = await _service.uploadGroupAttachment(
        groupId: widget.groupId,
        filePath: path,
        filename: f.name,
      );
      final attachmentId = (uploaded['attachment_id'] ?? uploaded['attachmentId'] ?? '').toString();
      if (attachmentId.isEmpty) return;

      final mime = (uploaded['file_type'] ?? uploaded['fileType'] ?? '').toString();
      final lowerName = f.name.toLowerCase();
      final isImage = mime.startsWith('image/') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png') || lowerName.endsWith('.webp') || lowerName.endsWith('.gif');

      await _service.sendGroupMessage(
        groupId: widget.groupId,
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
      final stoppedPath = await _recorder.stop();
      if (!mounted) return;
      setState(() => _recording = false);

      final path = stoppedPath ?? _recordPath;
      if (path == null || path.isEmpty) return;

      setState(() => _sending = true);
      try {
        final name = path.split(Platform.pathSeparator).last;
        final uploaded = await _service.uploadGroupAttachment(
          groupId: widget.groupId,
          filePath: path,
          filename: name,
          mimeType: 'audio/m4a',
        );
        final attachmentId = (uploaded['attachment_id'] ?? uploaded['attachmentId'] ?? '').toString();
        if (attachmentId.isEmpty) return;

        await _service.sendGroupMessage(
          groupId: widget.groupId,
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
    final file = File('${dir.path}/group-voice-${DateTime.now().millisecondsSinceEpoch}.m4a');
    _recordPath = file.path;

    await _recorder.start(
      const RecordConfig(),
      path: file.path,
    );
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

  Future<void> _openAttachment(GroupAttachment a) async {
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(widget.groupName)),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: FutureBuilder<Paginated<GroupMessage>>(
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
                              'Failed to load group messages',
                              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 12),
                            FilledButton(onPressed: _refresh, child: const Text('Retry')),
                          ],
                        ),
                      ),
                    );
                  }

                  final items = snapshot.data?.items ?? const <GroupMessage>[];
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
                        final senderName = m.senderName ?? '';
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
                                if (!isMine && senderName.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 4),
                                    child: Text(
                                      senderName,
                                      style: theme.textTheme.labelMedium?.copyWith(
                                        fontWeight: FontWeight.w800,
                                        color: textColor.withOpacity(0.9),
                                      ),
                                    ),
                                  ),
                                Text(
                                  content,
                                  style: theme.textTheme.bodyMedium?.copyWith(color: textColor),
                                ),
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
