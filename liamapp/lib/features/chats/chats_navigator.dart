import 'package:flutter/material.dart';

import 'chat_screen.dart';
import 'conversations_screen.dart';
import 'new_chat_screen.dart';

class ChatsNavigator extends StatelessWidget {
  const ChatsNavigator({super.key, required this.navigatorKey});

  final GlobalKey<NavigatorState> navigatorKey;

  @override
  Widget build(BuildContext context) {
    return Navigator(
      key: navigatorKey,
      initialRoute: ConversationsScreen.routeName,
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case ConversationsScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const ConversationsScreen(),
            );
          case NewChatScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const NewChatScreen(),
            );
          case ChatScreen.routeName:
          case '/chats/chat':
            final args = (settings.arguments as Map?) ?? const {};
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => ChatScreen(
                conversationId: (args['conversationId'] ?? '').toString(),
                participantName: (args['participantName'] ?? 'Chat').toString(),
                participantId: (args['participantId'] ?? '').toString(),
              ),
            );
          default:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const ConversationsScreen(),
            );
        }
      },
    );
  }
}
