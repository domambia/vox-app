import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../auth/auth_controller.dart';
import '../chats/chats_navigator.dart';
import '../chats/new_chat_screen.dart';
import '../groups/groups_navigator.dart';
import '../groups/new_group_screen.dart';
import '../events/events_navigator.dart';
import '../events/create_event_screen.dart';
import '../discover/discover_navigator.dart';
import '../discover/matches_screen.dart';
import '../discover/likes_screen.dart';
import '../profile/profile_navigator.dart';
import '../profile/notifications_screen.dart';
import '../profile/settings_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  static const routeName = '/app';

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 1;

  final ValueNotifier<int> _tabIndex = ValueNotifier<int>(1);

  bool _redirecting = false;

  final _discoverKey = GlobalKey<NavigatorState>();
  final _chatsKey = GlobalKey<NavigatorState>();
  final _groupsKey = GlobalKey<NavigatorState>();
  final _eventsKey = GlobalKey<NavigatorState>();
  final _profileKey = GlobalKey<NavigatorState>();

  @override
  void dispose() {
    _tabIndex.dispose();
    super.dispose();
  }

  List<GlobalKey<NavigatorState>> get _keys => [
        _discoverKey,
        _chatsKey,
        _groupsKey,
        _eventsKey,
        _profileKey,
      ];

  Future<bool> _onWillPop() async {
    final nav = _keys[_index].currentState;
    if (nav != null && nav.canPop()) {
      nav.pop();
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    final auth = Provider.of<AuthController>(context, listen: true);
    if (!auth.isAuthenticated && !_redirecting) {
      _redirecting = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        Navigator.of(context).pushNamedAndRemoveUntil('/', (r) => false);
        _redirecting = false;
      });
      return const Scaffold(body: SafeArea(child: Center(child: CircularProgressIndicator())));
    }

    return ListenableProvider<ValueNotifier<int>>.value(
      value: _tabIndex,
      child: WillPopScope(
        onWillPop: _onWillPop,
        child: Scaffold(
          appBar: AppBar(
            title: const Text('LiamApp'),
            actions: [
            if (_index == 0) ...[
              IconButton(
                onPressed: () {
                  _discoverKey.currentState?.pushNamed(MatchesScreen.routeName);
                },
                icon: const Icon(Icons.people),
                tooltip: 'Matches',
              ),
              IconButton(
                onPressed: () {
                  _discoverKey.currentState?.pushNamed(
                    LikesScreen.routeName,
                    arguments: {'type': 'received'},
                  );
                },
                icon: const Icon(Icons.favorite),
                tooltip: 'Likes',
              ),
            ],
            if (_index == 1)
              IconButton(
                onPressed: () {
                  _chatsKey.currentState?.pushNamed(NewChatScreen.routeName);
                },
                icon: const Icon(Icons.chat),
                tooltip: 'New chat',
              ),
            if (_index == 2)
              IconButton(
                onPressed: () {
                  _groupsKey.currentState?.pushNamed(NewGroupScreen.routeName);
                },
                icon: const Icon(Icons.group_add),
                tooltip: 'New group',
              ),
            if (_index == 3)
              IconButton(
                onPressed: () {
                  _eventsKey.currentState?.pushNamed(CreateEventScreen.routeName);
                },
                icon: const Icon(Icons.add),
                tooltip: 'New event',
              ),
            if (_index == 4)
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert),
                onSelected: (value) async {
                  switch (value) {
                    case 'settings':
                      _profileKey.currentState?.pushNamed(SettingsScreen.routeName);
                      return;
                    case 'notifications':
                      _profileKey.currentState?.pushNamed(NotificationsScreen.routeName);
                      return;
                    case 'logout':
                      await Provider.of<AuthController>(context, listen: false).logout();
                      if (!context.mounted) return;
                      Navigator.of(context).pushNamedAndRemoveUntil('/', (r) => false);
                      return;
                  }
                },
                itemBuilder: (context) => const [
                  PopupMenuItem(
                    value: 'settings',
                    child: Text('Settings'),
                  ),
                  PopupMenuItem(
                    value: 'notifications',
                    child: Text('Notifications'),
                  ),
                  PopupMenuDivider(),
                  PopupMenuItem(
                    value: 'logout',
                    child: Text('Logout'),
                  ),
                ],
              ),
          ],
        ),
        body: SafeArea(
          child: IndexedStack(
            index: _index,
            children: [
              DiscoverNavigator(navigatorKey: _discoverKey),
              ChatsNavigator(navigatorKey: _chatsKey),
              GroupsNavigator(navigatorKey: _groupsKey),
              EventsNavigator(navigatorKey: _eventsKey),
              ProfileNavigator(navigatorKey: _profileKey),
            ],
          ),
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _index,
          backgroundColor: colorScheme.surface,
          onDestinationSelected: (i) {
            if (i == _index) {
              _keys[i].currentState?.popUntil((r) => r.isFirst);
              _tabIndex.value = i;
              return;
            }
            setState(() => _index = i);
            _tabIndex.value = i;
          },
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.favorite_border),
              selectedIcon: Icon(Icons.favorite),
              label: 'Discover',
            ),
            NavigationDestination(
              icon: Icon(Icons.chat_bubble_outline),
              selectedIcon: Icon(Icons.chat_bubble),
              label: 'Chats',
            ),
            NavigationDestination(
              icon: Icon(Icons.groups_outlined),
              selectedIcon: Icon(Icons.groups),
              label: 'Groups',
            ),
            NavigationDestination(
              icon: Icon(Icons.event_outlined),
              selectedIcon: Icon(Icons.event),
              label: 'Events',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Profile',
            ),
          ],
        ),
      ),
      ),
    );
  }
}

class _TabNavigator extends StatelessWidget {
  const _TabNavigator({required this.navigatorKey, required this.root});

  final GlobalKey<NavigatorState> navigatorKey;
  final Widget root;

  @override
  Widget build(BuildContext context) {
    return Navigator(
      key: navigatorKey,
      onGenerateRoute: (settings) {
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => root,
        );
      },
    );
  }
}

class _PlaceholderPage extends StatelessWidget {
  const _PlaceholderPage({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
