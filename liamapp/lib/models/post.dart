class Post {
  const Post({
    required this.postId,
    required this.userId,
    required this.content,
    this.imageUrl,
    this.authorName,
    this.authorAvatar,
    this.createdAt,
    this.likesCount = 0,
    this.isLiked = false,
  });

  final String postId;
  final String userId;
  final String content;
  final String? imageUrl;
  final String? authorName;
  final String? authorAvatar;
  final DateTime? createdAt;
  final int likesCount;
  final bool isLiked;

  factory Post.fromJson(dynamic json) {
    if (json is! Map) {
      return const Post(postId: '', userId: '', content: '');
    }

    final postId = (json['post_id'] ?? json['postId'] ?? json['id'] ?? '').toString();
    final userId = (json['user_id'] ?? json['userId'] ?? '').toString();
    final content = (json['content'] ?? json['text'] ?? '').toString();
    final imageUrl = (json['image_url'] ?? json['imageUrl'] ?? json['image'] ?? '').toString();
    
    final author = json['author'] ?? json['user'] ?? {};
    final authorName = _extractAuthorName(author, json);
    final authorAvatar = (author['avatar_url'] ?? author['avatarUrl'] ?? author['avatar'] ?? '').toString();

    DateTime? createdAt;
    final rawDate = json['created_at'] ?? json['createdAt'];
    if (rawDate != null) {
      createdAt = DateTime.tryParse(rawDate.toString());
    }

    final likesCount = (json['likes_count'] ?? json['likesCount'] ?? json['likes'] ?? 0);
    final isLiked = json['is_liked'] ?? json['isLiked'] ?? false;

    return Post(
      postId: postId,
      userId: userId,
      content: content,
      imageUrl: imageUrl.isEmpty ? null : imageUrl,
      authorName: authorName.isEmpty ? null : authorName,
      authorAvatar: authorAvatar.isEmpty ? null : authorAvatar,
      createdAt: createdAt,
      likesCount: likesCount is int ? likesCount : int.tryParse(likesCount.toString()) ?? 0,
      isLiked: isLiked == true,
    );
  }

  static String _extractAuthorName(dynamic author, dynamic json) {
    if (author is Map) {
      final first = (author['first_name'] ?? author['firstName'] ?? '').toString();
      final last = (author['last_name'] ?? author['lastName'] ?? '').toString();
      final display = (author['display_name'] ?? author['displayName'] ?? '').toString();
      if (display.isNotEmpty) return display;
      final name = '$first $last'.trim();
      if (name.isNotEmpty) return name;
    }
    return (json['author_name'] ?? json['authorName'] ?? '').toString();
  }

  String get timeAgo {
    if (createdAt == null) return '';
    final diff = DateTime.now().difference(createdAt!);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${(diff.inDays / 7).floor()}w ago';
  }
}
