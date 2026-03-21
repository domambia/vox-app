import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../models/post.dart';
import 'post_view_screen.dart';
import 'posts_service.dart';

/// Loads a post by id then shows [PostViewScreen] (e.g. push notification deep link).
class PostByIdScreen extends StatefulWidget {
  const PostByIdScreen({super.key, required this.postId});

  static const routeName = '/discover/post-by-id';

  final String postId;

  @override
  State<PostByIdScreen> createState() => _PostByIdScreenState();
}

class _PostByIdScreenState extends State<PostByIdScreen> {
  late Future<Post> _future;
  var _didInit = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_didInit) return;
    _didInit = true;
    final api = Provider.of<ApiClient>(context, listen: false);
    _future = widget.postId.isEmpty
        ? Future.error(StateError('missing postId'))
        : PostsService(api).getPost(widget.postId);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Post>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Scaffold(
            appBar: AppBar(),
            body: const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Could not load post',
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          );
        }
        if (!snapshot.hasData) {
          return Scaffold(
            appBar: AppBar(),
            body: const Center(child: CircularProgressIndicator()),
          );
        }
        return PostViewScreen(post: snapshot.data!);
      },
    );
  }
}
