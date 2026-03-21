import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_localizations.dart';
import '../../core/media_url.dart';
import '../../core/toast.dart';
import '../../models/post.dart';
import 'posts_service.dart';

class PostViewScreen extends StatefulWidget {
  const PostViewScreen({
    super.key,
    required this.post,
  });

  final Post post;

  static const routeName = '/posts/view';

  @override
  State<PostViewScreen> createState() => _PostViewScreenState();
}

class _PostViewScreenState extends State<PostViewScreen> {
  late Post _post;
  bool _isLiking = false;

  @override
  void initState() {
    super.initState();
    _post = widget.post;
  }

  String _absoluteUrl(String fileUrl) {
    return resolveMediaUrl(fileUrl);
  }

  Future<void> _toggleLike() async {
    if (_isLiking) return;
    setState(() => _isLiking = true);

    try {
      final service = PostsService(Provider.of<ApiClient>(context, listen: false));
      if (_post.isLiked) {
        await service.unlikePost(_post.postId);
        setState(() {
          _post = Post(
            postId: _post.postId,
            userId: _post.userId,
            content: _post.content,
            imageUrl: _post.imageUrl,
            authorName: _post.authorName,
            authorAvatar: _post.authorAvatar,
            createdAt: _post.createdAt,
            likesCount: _post.likesCount - 1,
            isLiked: false,
          );
        });
      } else {
        await service.likePost(_post.postId);
        setState(() {
          _post = Post(
            postId: _post.postId,
            userId: _post.userId,
            content: _post.content,
            imageUrl: _post.imageUrl,
            authorName: _post.authorName,
            authorAvatar: _post.authorAvatar,
            createdAt: _post.createdAt,
            likesCount: _post.likesCount + 1,
            isLiked: true,
          );
        });
      }
    } catch (e) {
      if (!mounted) return;
      showToast(context, context.l10n.phrase('Failed to update like'), isError: true);
    } finally {
      if (mounted) setState(() => _isLiking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      extendBodyBehindAppBar: true,
      body: GestureDetector(
        onTap: () => Navigator.of(context).pop(),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (_post.imageUrl != null && _post.imageUrl!.isNotEmpty)
              Center(
                child: FutureBuilder<String?>(
                  future: Provider.of<ApiClient>(context, listen: false).readAccessToken(),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState != ConnectionState.done) {
                      return Center(
                        child: CircularProgressIndicator(
                          color: colorScheme.onPrimary.withOpacity(0.85),
                        ),
                      );
                    }
                    final token = snapshot.hasError ? null : snapshot.data;
                    final headers = <String, String>{};
                    if (token != null && token.isNotEmpty) {
                      headers['Authorization'] = 'Bearer $token';
                    }
                    final imageUrl = _absoluteUrl(_post.imageUrl!);
                    return InteractiveViewer(
                      child: Image.network(
                        imageUrl,
                        key: ValueKey('post-$imageUrl-${token ?? ''}'),
                        headers: headers.isNotEmpty ? headers : null,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => Container(
                          color: colorScheme.surfaceContainerHighest,
                          child: const Center(
                            child: Icon(Icons.broken_image_outlined, size: 64, color: Colors.white54),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              )
            else
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      colorScheme.primary,
                      colorScheme.secondary,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Text(
                      _post.content,
                      style: theme.textTheme.headlineMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.transparent, Colors.black.withAlpha(200)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: SafeArea(
                  top: false,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: colorScheme.primary,
                            child: Text(
                              (_post.authorName ?? l10n.phrase('U'))[0].toUpperCase(),
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _post.authorName ?? l10n.phrase('User'),
                                  style: theme.textTheme.titleMedium?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Text(
                                  _post.timeAgo,
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: Colors.white70,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          GestureDetector(
                            onTap: _toggleLike,
                            child: Row(
                              children: [
                                Icon(
                                  _post.isLiked ? Icons.favorite : Icons.favorite_border,
                                  color: _post.isLiked ? Colors.red : Colors.white,
                                  size: 28,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  '${_post.likesCount}',
                                  style: theme.textTheme.titleMedium?.copyWith(color: Colors.white),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      if (_post.content.isNotEmpty && _post.imageUrl != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          _post.content,
                          style: theme.textTheme.bodyLarge?.copyWith(color: Colors.white),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
