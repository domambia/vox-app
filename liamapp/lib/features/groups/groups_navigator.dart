import 'package:flutter/material.dart';

import 'group_chat_screen.dart';
import 'groups_list_screen.dart';
import 'new_group_screen.dart';

class GroupsNavigator extends StatelessWidget {
  const GroupsNavigator({super.key, required this.navigatorKey});

  final GlobalKey<NavigatorState> navigatorKey;

  @override
  Widget build(BuildContext context) {
    return Navigator(
      key: navigatorKey,
      initialRoute: GroupsListScreen.routeName,
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case GroupsListScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const GroupsListScreen(),
            );
          case NewGroupScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const NewGroupScreen(),
            );
          case GroupChatScreen.routeName:
          case '/groups/chat':
            final args = (settings.arguments as Map?) ?? const {};
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => GroupChatScreen(
                groupId: (args['groupId'] ?? '').toString(),
                groupName: (args['groupName'] ?? 'Group').toString(),
              ),
            );
          default:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const GroupsListScreen(),
            );
        }
      },
    );
  }
}
