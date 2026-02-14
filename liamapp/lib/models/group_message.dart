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
    final isMine = (json['is_mine'] ?? json['isMine'] ?? false) == true;

    final messageType = (json['message_type'] ?? json['messageType'] ?? 'TEXT').toString();
    final rawAttachments = json['attachments'];
    final attachments = rawAttachments is List
        ? rawAttachments.map(GroupAttachment.fromJson).toList(growable: false)
        : const <GroupAttachment>[];

    final sender = json['sender'];
    final senderId = (json['sender_id'] ?? json['senderId'] ?? (sender is Map ? (sender['user_id'] ?? sender['userId']) : null) ?? '').toString();

    final senderName = sender is Map
        ? ((sender['first_name'] ?? sender['firstName'] ?? '').toString())
        : null;

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
    final fileUrl = (json['file_url'] ?? json['fileUrl'] ?? '').toString();
    final fileType = (json['file_type'] ?? json['fileType'] ?? '').toString();
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
