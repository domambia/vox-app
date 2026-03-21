import '../core/media_url.dart';

class GroupMessage {
  const GroupMessage({
    required this.messageId,
    required this.content,
    required this.senderId,
    required this.isMine,
    this.messageType = 'TEXT',
    this.attachments = const <GroupAttachment>[],
    this.senderName,
    this.createdAt,
  });

  final String messageId;
  final String content;
  final String senderId;
  final bool isMine;
  final String messageType;
  final List<GroupAttachment> attachments;
  final String? senderName;
  final DateTime? createdAt;

  factory GroupMessage.fromJson(dynamic json) {
    if (json is! Map) {
      return const GroupMessage(messageId: '', content: '', senderId: '', isMine: false);
    }

    final messageId = (json['message_id'] ?? json['messageId'] ?? json['id'] ?? '').toString();
    final content = (json['content'] ?? '').toString();
    final isMineRaw = json['is_mine'] ?? json['isMine'] ?? false;
    final isMine = isMineRaw == true || isMineRaw.toString().toLowerCase() == 'true';

    final messageType = (json['message_type'] ?? json['messageType'] ?? 'TEXT').toString();
    final rawAttachments =
        json['attachments'] ?? json['message_attachments'] ?? json['messageAttachments'];
    final attachments = rawAttachments is List
        ? rawAttachments.map(GroupAttachment.fromJson).toList(growable: false)
        : ((json['file_url'] ?? json['fileUrl']) != null
            ? <GroupAttachment>[
                GroupAttachment.fromJson({
                  'attachment_id': json['attachment_id'] ?? json['attachmentId'] ?? '',
                  'file_url': json['file_url'] ?? json['fileUrl'] ?? '',
                  'file_type': json['file_type'] ?? json['fileType'] ?? '',
                  'file_name': json['file_name'] ?? json['fileName'] ?? content,
                  'file_size': json['file_size'] ?? json['fileSize'] ?? 0,
                }),
              ]
            : const <GroupAttachment>[]);

    final sender = json['sender'];
    final senderId = (json['sender_id'] ?? json['senderId'] ?? (sender is Map ? (sender['user_id'] ?? sender['userId']) : null) ?? '').toString();

    String? senderName;
    if (sender is Map) {
      final first = (sender['first_name'] ?? sender['firstName'] ?? '').toString();
      final last = (sender['last_name'] ?? sender['lastName'] ?? '').toString();
      final fullName = [first, last].where((p) => p.trim().isNotEmpty).join(' ').trim();
      final displayName = (sender['display_name'] ?? sender['displayName'] ?? '').toString().trim();
      senderName = displayName.isNotEmpty ? displayName : (fullName.isNotEmpty ? fullName : null);
    }

    DateTime? createdAt;
    final rawDate = json['created_at'] ?? json['createdAt'];
    if (rawDate != null) {
      createdAt = DateTime.tryParse(rawDate.toString());
    }

    return GroupMessage(
      messageId: messageId,
      content: content,
      senderId: senderId,
      isMine: isMine,
      messageType: messageType,
      attachments: attachments,
      senderName: senderName != null && senderName.isNotEmpty ? senderName : null,
      createdAt: createdAt,
    );
  }
}

class GroupAttachment {
  const GroupAttachment({
    required this.attachmentId,
    required this.fileUrl,
    required this.fileType,
    required this.fileName,
    required this.fileSize,
  });

  final String attachmentId;
  final String fileUrl;
  final String fileType;
  final String fileName;
  final int fileSize;

  bool get isImage {
    final lowerType = fileType.toLowerCase();
    if (lowerType.startsWith('image/')) return true;
    final lowerName = fileName.toLowerCase();
    final lowerUrl = fileUrl.toLowerCase();
    return lowerName.endsWith('.jpg') ||
        lowerName.endsWith('.jpeg') ||
        lowerName.endsWith('.png') ||
        lowerName.endsWith('.webp') ||
        lowerName.endsWith('.gif') ||
        lowerUrl.endsWith('.jpg') ||
        lowerUrl.endsWith('.jpeg') ||
        lowerUrl.endsWith('.png') ||
        lowerUrl.endsWith('.webp') ||
        lowerUrl.endsWith('.gif');
  }

  bool get isAudio => fileType.toLowerCase().startsWith('audio/');

  factory GroupAttachment.fromJson(dynamic json) {
    if (json is! Map) {
      return const GroupAttachment(
        attachmentId: '',
        fileUrl: '',
        fileType: '',
        fileName: '',
        fileSize: 0,
      );
    }

    final attachmentId = (json['attachment_id'] ?? json['attachmentId'] ?? json['id'] ?? '').toString();
    final fileUrlRaw = (json['file_url'] ?? json['fileUrl'] ?? '').toString();
    final fileUrl = resolveMediaUrl(fileUrlRaw);
    final fileType = (json['file_type'] ?? json['fileType'] ?? '').toString().toLowerCase();
    final fileName = (json['file_name'] ?? json['fileName'] ?? '').toString();
    final fileSizeRaw = json['file_size'] ?? json['fileSize'] ?? 0;
    final fileSize = fileSizeRaw is int ? fileSizeRaw : int.tryParse(fileSizeRaw.toString()) ?? 0;

    return GroupAttachment(
      attachmentId: attachmentId,
      fileUrl: fileUrl,
      fileType: fileType,
      fileName: fileName,
      fileSize: fileSize,
    );
  }
}
