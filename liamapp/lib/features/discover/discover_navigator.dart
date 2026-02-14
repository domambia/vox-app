import 'package:flutter/material.dart';

import 'discover_screen.dart';
import 'likes_screen.dart';
import 'matches_screen.dart';

class DiscoverNavigator extends StatelessWidget {
  const DiscoverNavigator({super.key, required this.navigatorKey});

  final GlobalKey<NavigatorState> navigatorKey;

  @override
  Widget build(BuildContext context) {
    return Navigator(
      key: navigatorKey,
      initialRoute: DiscoverScreen.routeName,
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case DiscoverScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const DiscoverScreen(),
            );
          case MatchesScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const MatchesScreen(),
            );
          case LikesScreen.routeName:
            final args = (settings.arguments as Map?) ?? const {};
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => LikesScreen(type: (args['type'] ?? 'received').toString()),
            );
          default:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const DiscoverScreen(),
            );
        }
      },
    );
  }
}
