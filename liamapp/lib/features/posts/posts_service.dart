import 'dart:io';

import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';

import '../../core/api_client.dart';
import '../../core/api_parsing.dart';
import '../../core/pagination.dart';
import '../../models/post.dart';

class PostsService {
  PostsService(this._apiClient);

  final ApiClient _apiClient;

  Future<Paginated<Post>> listPosts({int page = 1, int limit = 20}) async {
    final query = <String, dynamic>{
      'limit': limit,
      'offset': (page - 1) * limit,
      'page': page,
    };

    final resp = await _apiClient.dio.get('/posts', queryParameters: query);
    final items = unwrapList(resp.data, keys: const ['items', 'posts', 'data']);
    final paginationJson = unwrapPagination(resp.data);

    return Paginated(
      items: items.map(Post.fromJson).toList(growable: false),
      pagination: paginationJson == null
          ? null
          : Pagination.fromJson(paginationJson, fallbackPage: page, fallbackLimit: limit),
    );
  }

  Future<List<Post>> getRecentPosts({int limit = 20}) async {
    final resp = await _apiClient.dio.get('/posts/recent', queryParameters: {'limit': limit});
    final items = unwrapList(resp.data, keys: const ['items', 'posts', 'data']);
    return items.map(Post.fromJson).toList(growable: false);
  }

  Future<Post> getPost(String postId) async {
    final resp = await _apiClient.dio.get('/posts/$postId');
    final root = unwrapData(resp.data);
    return Post.fromJson(root);
  }

  Future<Map<String, dynamic>> createPost({
    required String content,
    String? imagePath,
  }) async {
    if (imagePath != null && imagePath.isNotEmpty) {
      final file = File(imagePath);
      final fileName = file.path.split('/').last;
      final ext = fileName.split('.').last.toLowerCase();
      
      String mimeType = 'image/jpeg';
      if (ext == 'png') mimeType = 'image/png';
      if (ext == 'gif') mimeType = 'image/gif';
      if (ext == 'webp') mimeType = 'image/webp';

      final formData = FormData.fromMap({
        'content': content,
        'postImage': await MultipartFile.fromFile(
          imagePath,
          filename: fileName,
          contentType: MediaType.parse(mimeType),
        ),
      });

      final resp = await _apiClient.dio.post('/posts', data: formData);
      return _extractResponse(resp.data);
    }

    final resp = await _apiClient.dio.post('/posts', data: {'content': content});
    return _extractResponse(resp.data);
  }

  Future<void> deletePost(String postId) async {
    await _apiClient.dio.delete('/posts/$postId');
  }

  Future<void> likePost(String postId) async {
    await _apiClient.dio.post('/posts/$postId/like');
  }

  Future<void> unlikePost(String postId) async {
    await _apiClient.dio.delete('/posts/$postId/like');
  }

  Map<String, dynamic> _extractResponse(dynamic data) {
    if (data is Map) {
      final root = data['data'] ?? data;
      return root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{};
    }
    return <String, dynamic>{};
  }
}
