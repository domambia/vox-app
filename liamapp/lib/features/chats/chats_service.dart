import '../../core/api_client.dart';
import '../../core/api_parsing.dart';
import '../../core/pagination.dart';
import '../../models/chat_message.dart';
import '../../models/conversation.dart';
import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';

class ChatsService {
  ChatsService(this._apiClient);

  final ApiClient _apiClient;

  Future<Paginated<Conversation>> listConversationsTyped({int page = 1, int limit = 20}) async {
    final resp = await _apiClient.dio.get(
      '/conversations',
      queryParameters: {
        'limit': limit,
        'offset': (page - 1) * limit,
        'page': page,
      },
    );

    final items = unwrapList(resp.data, keys: const ['items', 'conversations']);
    final paginationJson = unwrapPagination(resp.data);

    return Paginated(
      items: items.map(Conversation.fromJson).toList(growable: false),
      pagination: paginationJson == null ? null : Pagination.fromJson(paginationJson, fallbackPage: page, fallbackLimit: limit),
    );
  }

  Future<Paginated<ChatMessage>> getMessagesTyped({required String conversationId, int page = 1, int limit = 50}) async {
    final resp = await _apiClient.dio.get(
      '/conversations/$conversationId/messages',
      queryParameters: {
        'limit': limit,
        'offset': (page - 1) * limit,
        'page': page,
      },
    );

    final items = unwrapList(resp.data, keys: const ['items', 'messages']);
    final paginationJson = unwrapPagination(resp.data);

    return Paginated(
      items: items.map(ChatMessage.fromJson).toList(growable: false),
      pagination: paginationJson == null ? null : Pagination.fromJson(paginationJson, fallbackPage: page, fallbackLimit: limit),
    );
  }

  Future<Map<String, dynamic>> listConversations({int page = 1, int limit = 20}) async {
    final resp = await _apiClient.dio.get(
      '/conversations',
      queryParameters: {
        'limit': limit,
        'offset': (page - 1) * limit,
        'page': page,
      },
    );
    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return {
      'items': (root['items'] ?? root['conversations'] ?? root['data'] ?? []) as dynamic,
      'pagination': root['pagination'] as dynamic,
    };
  }

  Future<Map<String, dynamic>> getMessages({required String conversationId, int page = 1, int limit = 50}) async {
    final resp = await _apiClient.dio.get(
      '/conversations/$conversationId/messages',
      queryParameters: {
        'limit': limit,
        'offset': (page - 1) * limit,
        'page': page,
      },
    );
    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return {
      'items': (root['items'] ?? root['messages'] ?? root['data'] ?? []) as dynamic,
      'pagination': root['pagination'] as dynamic,
    };
  }

  Future<void> markAsRead(String conversationId) async {
    await _apiClient.dio.post('/conversations/$conversationId/read');
  }

  Future<Map<String, dynamic>> sendMessage({
    required String recipientId,
    required String content,
    String messageType = 'TEXT',
    List<String>? attachmentIds,
  }) async {
    final resp = await _apiClient.dio.post(
      '/messages',
      data: {
        'recipientId': recipientId,
        'content': content,
        'messageType': messageType,
        if (attachmentIds != null && attachmentIds.isNotEmpty) 'attachmentIds': attachmentIds,
      },
    );
    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return (root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{});
  }

  Future<Map<String, dynamic>> uploadAttachment({required String filePath, required String filename, String? mimeType}) async {
    final form = FormData.fromMap({
      'messageAttachment': await MultipartFile.fromFile(
        filePath,
        filename: filename,
        contentType: mimeType == null ? null : MediaType.parse(mimeType),
      ),
    });

    final resp = await _apiClient.dio.post(
      '/messages/attachments',
      data: form,
      options: Options(contentType: 'multipart/form-data'),
    );

    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return (root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{});
  }

  Future<Map<String, dynamic>> editMessage({required String messageId, required String content}) async {
    final resp = await _apiClient.dio.put(
      '/messages/$messageId',
      data: {
        'content': content,
      },
    );
    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return (root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{});
  }

  Future<void> deleteMessage({required String messageId}) async {
    await _apiClient.dio.delete('/messages/$messageId');
  }
}
