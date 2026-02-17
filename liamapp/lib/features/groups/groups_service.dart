import '../../core/api_client.dart';
import '../../core/api_parsing.dart';
import '../../core/pagination.dart';
import '../../models/group.dart';
import '../../models/group_message.dart';
import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';

class GroupsService {
  GroupsService(this._apiClient);

  final ApiClient _apiClient;

  Future<Paginated<Group>> listGroupsTyped({int page = 1, int limit = 20, String? search, bool memberOnly = true}) async {
    final query = <String, dynamic>{
      'limit': limit,
      'page': page,
    };
    if (search != null && search.trim().isNotEmpty) query['search'] = search.trim();
    if (memberOnly) query['memberOnly'] = true;

    final resp = await _apiClient.dio.get('/groups', queryParameters: query);
    final items = unwrapList(resp.data, keys: const ['items', 'groups']);
    final paginationJson = unwrapPagination(resp.data);

    return Paginated(
      items: items.map(Group.fromJson).toList(growable: false),
      pagination: paginationJson == null ? null : Pagination.fromJson(paginationJson, fallbackPage: page, fallbackLimit: limit),
    );
  }

  Future<Map<String, dynamic>> addMemberToGroup({required String groupId, required String userId}) async {
    final resp = await _apiClient.dio.post(
      '/groups/$groupId/members',
      data: {
        'userId': userId,
      },
    );

    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return (root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{});
  }

  Future<List<dynamic>> searchUsersForGroupMember({required String groupId, required String query, int limit = 20}) async {
    final q = query.trim();
    if (q.isEmpty) return <dynamic>[];

    final resp = await _apiClient.dio.get(
      '/groups/$groupId/members/search',
      queryParameters: {
        'q': q,
        'limit': limit,
      },
    );

    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    final items = (root['users'] ?? root['items'] ?? []) as dynamic;
    return items is List ? items : <dynamic>[];
  }

  Future<Paginated<GroupMessage>> getGroupMessagesTyped({required String groupId, int limit = 50, int offset = 0}) async {
    final resp = await _apiClient.dio.get(
      '/groups/$groupId/messages',
      queryParameters: {
        'limit': limit,
        'offset': offset,
      },
    );

    final items = unwrapList(resp.data, keys: const ['items', 'messages']);
    final paginationJson = unwrapPagination(resp.data);

    return Paginated(
      items: items.map(GroupMessage.fromJson).toList(growable: false),
      pagination: paginationJson == null ? null : Pagination.fromJson(paginationJson, fallbackPage: 1, fallbackLimit: limit),
    );
  }

  Future<Map<String, dynamic>> listGroups({int page = 1, int limit = 20, String? search, bool memberOnly = true}) async {
    final query = <String, dynamic>{
      'limit': limit,
    };
    // backend uses offset sometimes; mob-app maps page->offset. We'll send page/limit as well.
    query['page'] = page;
    if (search != null && search.trim().isNotEmpty) query['search'] = search.trim();
    if (memberOnly) query['memberOnly'] = true;

    final resp = await _apiClient.dio.get('/groups', queryParameters: query);
    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;

    return {
      'items': (root['items'] ?? root['groups'] ?? root['data'] ?? []) as dynamic,
      'pagination': root['pagination'] as dynamic,
    };
  }

  Future<Map<String, dynamic>> createGroup({required String name, String? description, String category = 'general', bool isPublic = true}) async {
    final resp = await _apiClient.dio.post(
      '/groups',
      data: {
        'name': name,
        'description': description ?? '',
        'category': category,
        'isPublic': isPublic,
      },
    );

    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return (root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{});
  }

  Future<Map<String, dynamic>> uploadGroupAttachment({
    required String groupId,
    required String filePath,
    required String filename,
    String? mimeType,
  }) async {
    final form = FormData.fromMap({
      'messageAttachment': await MultipartFile.fromFile(
        filePath,
        filename: filename,
        contentType: mimeType == null ? null : MediaType.parse(mimeType),
      ),
    });

    final resp = await _apiClient.dio.post(
      '/groups/$groupId/attachments',
      data: form,
      options: Options(contentType: 'multipart/form-data'),
    );

    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return (root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{});
  }

  Future<Map<String, dynamic>> getGroupMessages({required String groupId, int limit = 50, int offset = 0}) async {
    final resp = await _apiClient.dio.get(
      '/groups/$groupId/messages',
      queryParameters: {
        'limit': limit,
        'offset': offset,
      },
    );
    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;

    return {
      'items': (root['items'] ?? root['messages'] ?? root['data'] ?? []) as dynamic,
      'pagination': root['pagination'] as dynamic,
    };
  }

  Future<Map<String, dynamic>> sendGroupMessage({
    required String groupId,
    required String content,
    String messageType = 'TEXT',
    List<String>? attachmentIds,
  }) async {
    final resp = await _apiClient.dio.post(
      '/groups/$groupId/messages',
      data: {
        'content': content.trim(),
        'message_type': messageType,
        if (attachmentIds != null && attachmentIds.isNotEmpty) 'attachmentIds': attachmentIds,
      },
    );

    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return (root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{});
  }

  Future<Map<String, dynamic>> updateGroup({
    required String groupId,
    String? name,
    String? description,
    String? category,
    bool? isPublic,
  }) async {
    final resp = await _apiClient.dio.put(
      '/groups/$groupId',
      data: {
        if (name != null) 'name': name,
        if (description != null) 'description': description,
        if (category != null) 'category': category,
        if (isPublic != null) 'isPublic': isPublic,
      },
    );

    final data = resp.data;
    final root = (data is Map ? (data['data'] ?? data) : <String, dynamic>{}) as dynamic;
    return (root is Map ? Map<String, dynamic>.from(root) : <String, dynamic>{});
  }

  Future<void> deleteGroup(String groupId) async {
    await _apiClient.dio.delete('/groups/$groupId');
  }
}
