class Conversation {
  const Conversation({
    required this.conversationId,
    required this.participantId,
    required this.participantName,
    this.lastMessagePreview,
  });

  final String conversationId;
  final String participantId;
  final String participantName;
  final String? lastMessagePreview;

  factory Conversation.fromJson(dynamic json) {
    if (json is! Map) {
      return const Conversation(
        conversationId: '',
        participantId: '',
        participantName: 'Chat',
      );
    }

    final conversationId = (json['conversation_id'] ?? json['conversationId'] ?? '').toString();

    final otherUser = json['other_user'] ?? json['otherUser'] ?? json['participant'];
    final otherUserId = otherUser is Map ? (otherUser['user_id'] ?? otherUser['userId'] ?? '').toString() : '';
    final otherFirst = otherUser is Map ? (otherUser['first_name'] ?? otherUser['firstName'] ?? '').toString() : '';
    final otherLast = otherUser is Map ? (otherUser['last_name'] ?? otherUser['lastName'] ?? '').toString() : '';
    final otherName = [otherFirst, otherLast].where((p) => p.trim().isNotEmpty).join(' ').trim();

    final participantId = (json['participant_id'] ?? json['participantId'] ?? otherUserId ?? '').toString();
    final participantName = (json['participant_name'] ?? json['participantName'] ?? (otherName.isNotEmpty ? otherName : null) ?? json['title'] ?? 'Chat').toString();
    final last = json['last_message'] ?? json['lastMessage'];
    final lastMessagePreview = (last is Map ? (last['content'] ?? '').toString() : null);

    final fallbackPreview = (json['last_message_preview'] ?? '').toString();

    return Conversation(
      conversationId: conversationId,
      participantId: participantId,
      participantName: participantName,
      lastMessagePreview: (lastMessagePreview != null && lastMessagePreview.isNotEmpty)
          ? lastMessagePreview
          : (fallbackPreview.isNotEmpty ? fallbackPreview : null),
    );
  }
}
