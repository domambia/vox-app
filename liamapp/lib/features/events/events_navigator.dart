import 'package:flutter/material.dart';

import 'create_event_screen.dart';
import 'event_detail_screen.dart';
import 'events_list_screen.dart';

class EventsNavigator extends StatelessWidget {
  const EventsNavigator({super.key, required this.navigatorKey});

  final GlobalKey<NavigatorState> navigatorKey;

  @override
  Widget build(BuildContext context) {
    return Navigator(
      key: navigatorKey,
      initialRoute: EventsListScreen.routeName,
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case EventsListScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const EventsListScreen(),
            );
          case CreateEventScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const CreateEventScreen(),
            );
          case EventDetailScreen.routeName:
          case '/events/detail':
            final args = (settings.arguments as Map?) ?? const {};
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => EventDetailScreen(
                eventId: (args['eventId'] ?? '').toString(),
              ),
            );
          default:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const EventsListScreen(),
            );
        }
      },
    );
  }
}
