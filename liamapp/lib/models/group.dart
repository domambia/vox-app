class Group {
  const Group({
    required this.groupId,
    required this.name,
    this.description,
  });

  final String groupId;
  final String name;
  final String? description;

  factory Group.fromJson(dynamic json) {
    if (json is! Map) {
      return const Group(groupId: '', name: 'Group');
    }

    final groupId = (json['group_id'] ?? json['groupId'] ?? json['id'] ?? '').toString();
    final name = (json['name'] ?? 'Group').toString();
    final description = (json['description'] ?? '').toString();

    return Group(
      groupId: groupId,
      name: name,
      description: description.isEmpty ? null : description,
    );
  }
}
