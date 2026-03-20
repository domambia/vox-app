import 'dart:async';
import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_localizations.dart';
import '../../core/toast.dart';
import '../../core/socket_service.dart';
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
import '../profile/notifications_service.dart';
import '../settings/settings_controller.dart';
import '../profile/settings_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  static const routeName = '/app';

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 1;
  int _discoverReloadKey = 0;
  int _chatsReloadKey = 0;
  int _groupsReloadKey = 0;
  int _eventsReloadKey = 0;
  int _profileReloadKey = 0;

  final ValueNotifier<int> _tabIndex = ValueNotifier<int>(1);

  bool _redirecting = false;

  int _unreadCount = 0;
  bool _isRefreshingUnread = false;
  Timer? _unreadTimer;
  StreamSubscription<Map<String, dynamic>>? _notificationSub;

  final _discoverKey = GlobalKey<NavigatorState>();
  final _chatsKey = GlobalKey<NavigatorState>();
  final _groupsKey = GlobalKey<NavigatorState>();
  final _eventsKey = GlobalKey<NavigatorState>();
  final _profileKey = GlobalKey<NavigatorState>();

  Future<void> _refreshUnreadCount() async {
    if (_isRefreshingUnread) return;
    _isRefreshingUnread = true;
    try {
      final apiClient = Provider.of<ApiClient>(context, listen: false);
      final service = NotificationsService(apiClient);
      final count = await service.getUnreadCount();
      if (!mounted) return;
      setState(() => _unreadCount = count);
    } catch (_) {
      // Ignore failures; badge will self-correct on next refresh.
    } finally {
      _isRefreshingUnread = false;
    }
  }

  Future<void> _playNotificationFeedback() async {
    if (kIsWeb) return;
    if (!Platform.isAndroid && !Platform.isIOS) return;

    final settings = Provider.of<SettingsController>(context, listen: false);
    final notifications = settings.notifications;

    if (notifications.soundEnabled) {
      await SystemSound.play(SystemSoundType.alert);
    }
    if (notifications.vibrationEnabled) {
      await HapticFeedback.mediumImpact();
    }
  }

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      await _refreshUnreadCount();

      final socket = Provider.of<SocketService>(context, listen: false);
      _notificationSub?.cancel();
      _notificationSub = socket.onNotificationNew.listen((_) async {
        if (!mounted) return;
        await _playNotificationFeedback();
        _refreshUnreadCount();
      });

      _unreadTimer?.cancel();
      _unreadTimer = Timer.periodic(const Duration(seconds: 90), (_) {
        if (!mounted) return;
        _refreshUnreadCount();
      });
    });
  }

  @override
  void dispose() {
    _notificationSub?.cancel();
    _unreadTimer?.cancel();
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

  void _forceRefetchForTab(int index) {
    switch (index) {
      case 0:
        _discoverReloadKey++;
        break;
      case 1:
        _chatsReloadKey++;
        break;
      case 2:
        _groupsReloadKey++;
        break;
      case 3:
        _eventsReloadKey++;
        break;
      case 4:
        _profileReloadKey++;
        break;
    }
  }

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
    final l10n = context.l10n;

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
            title: Text(l10n.appTitle),
            actions: [
              IconButton(
                tooltip: l10n.notifications,
                onPressed: () async {
                  final apiClient = Provider.of<ApiClient>(context, listen: false);
                  final service = NotificationsService(apiClient);
                  try {
                    await service.markAsRead();
                  } catch (_) {}

                  if (!mounted) return;
                  setState(() => _unreadCount = 0);
                  _profileKey.currentState?.pushNamed(NotificationsScreen.routeName);
                },
                icon: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    const Icon(Icons.notifications),
                    if (_unreadCount > 0)
                      Positioned(
                        right: -1,
                        top: -1,
                        child: Container(
                          padding: const EdgeInsets.all(5),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                          child: Center(
                            child: Text(
                              _unreadCount > 99 ? '99+' : '$_unreadCount',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            if (_index == 0) ...[
              IconButton(
                onPressed: () {
                  _discoverKey.currentState?.pushNamed(MatchesScreen.routeName);
                },
                icon: const Icon(Icons.people),
                tooltip: l10n.phrase('Matches'),
              ),
              IconButton(
                onPressed: () {
                  _discoverKey.currentState?.pushNamed(
                    LikesScreen.routeName,
                    arguments: {'type': 'received'},
                  );
                },
                icon: const Icon(Icons.favorite),
                tooltip: l10n.phrase('Likes'),
              ),
            ],
            if (_index == 1)
              IconButton(
                onPressed: () {
                  _chatsKey.currentState?.pushNamed(NewChatScreen.routeName);
                },
                icon: const Icon(Icons.chat),
                tooltip: l10n.phrase('New chat'),
              ),
            if (_index == 2)
              IconButton(
                onPressed: () {
                  _groupsKey.currentState?.pushNamed(NewGroupScreen.routeName);
                },
                icon: const Icon(Icons.group_add),
                tooltip: l10n.phrase('New group'),
              ),
            if (_index == 3)
              IconButton(
                onPressed: () {
                  _eventsKey.currentState?.pushNamed(CreateEventScreen.routeName);
                },
                icon: const Icon(Icons.add),
                tooltip: l10n.phrase('New event'),
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
                      try {
                        final apiClient = Provider.of<ApiClient>(context, listen: false);
                        final service = NotificationsService(apiClient);
                        await service.markAsRead();
                      } catch (_) {}
                      if (!context.mounted) return;
                      setState(() => _unreadCount = 0);
                      _profileKey.currentState?.pushNamed(NotificationsScreen.routeName);
                      return;
                    case 'logout':
                      await Provider.of<AuthController>(context, listen: false).logout();
                      if (!context.mounted) return;
                      showToast(context, l10n.loggedOut);
                      Navigator.of(context).pushNamedAndRemoveUntil('/', (r) => false);
                      return;
                  }
                },
                itemBuilder: (context) => [
                  PopupMenuItem(
                    value: 'settings',
                    child: Text(l10n.settings),
                  ),
                  PopupMenuItem(
                    value: 'notifications',
                    child: Text(l10n.notifications),
                  ),
                  const PopupMenuDivider(),
                  PopupMenuItem(
                    value: 'logout',
                    child: Text(l10n.logout),
                  ),
                ],
              ),
          ],
        ),
        body: SafeArea(
          child: IndexedStack(
            index: _index,
            children: [
              DiscoverNavigator(
                key: ValueKey('discover-$_discoverReloadKey'),
                navigatorKey: _discoverKey,
              ),
              ChatsNavigator(
                key: ValueKey('chats-$_chatsReloadKey'),
                navigatorKey: _chatsKey,
              ),
              GroupsNavigator(
                key: ValueKey('groups-$_groupsReloadKey'),
                navigatorKey: _groupsKey,
              ),
              EventsNavigator(
                key: ValueKey('events-$_eventsReloadKey'),
                navigatorKey: _eventsKey,
              ),
              ProfileNavigator(
                key: ValueKey('profile-$_profileReloadKey'),
                navigatorKey: _profileKey,
              ),
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
              setState(() {
                _forceRefetchForTab(i);
              });
              return;
            }

            // Update tab notifier first so destination screens read active tab immediately.
            _tabIndex.value = i;
            setState(() {
              _index = i;
              _forceRefetchForTab(i);
            });
          },
          destinations: [
            NavigationDestination(
              icon: Icon(Icons.favorite_border),
              selectedIcon: Icon(Icons.favorite),
              label: l10n.phrase('Discover'),
            ),
            NavigationDestination(
              icon: Icon(Icons.chat_bubble_outline),
              selectedIcon: Icon(Icons.chat_bubble),
              label: l10n.phrase('Chats'),
            ),
            NavigationDestination(
              icon: Icon(Icons.groups_outlined),
              selectedIcon: Icon(Icons.groups),
              label: l10n.phrase('Groups'),
            ),
            NavigationDestination(
              icon: Icon(Icons.event_outlined),
              selectedIcon: Icon(Icons.event),
              label: l10n.phrase('Events'),
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: l10n.phrase('Profile'),
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
