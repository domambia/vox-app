import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';

import 'core/app_localizations.dart';
import 'screens/auth/login_screen.dart';
import 'screens/landing_screen.dart';
import 'screens/splash_screen.dart';
import 'core/api_client.dart';
import 'core/config.dart';
import 'core/app_navigator.dart';
import 'core/notification_service.dart';
import 'core/push_notification_router.dart';
import 'core/socket_service.dart';
import 'core/startup_permissions.dart';
import 'core/toast.dart';
import 'core/token_storage.dart';
import 'features/app/app_gate.dart';
import 'features/app/app_shell.dart';
import 'features/auth/auth_controller.dart';
import 'features/auth/otp_login_screen.dart';
import 'features/auth/otp_register_screen.dart';
import 'features/calls/call_manager.dart';
import 'features/calls/incoming_call_screen.dart';
import 'features/settings/settings_controller.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {
    // Ignore missing .env in dev; AppConfig will fall back to defaults.
  }

  if (!kReleaseMode) {
    debugPrint('[AppConfig] apiBaseUrl: ${AppConfig.apiBaseUrl}');
    debugPrint('[AppConfig] socketBaseUrl: ${AppConfig.socketBaseUrl}');
  }
  await NotificationService.instance.initialize();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<SettingsController>(
          create: (_) => SettingsController(),
        ),
        Provider<TokenStorage>(create: (_) => TokenStorage()),
        ProxyProvider<TokenStorage, SocketService>(
          update: (_, tokenStorage, previous) => SocketService(tokenStorage: tokenStorage),
        ),
        ProxyProvider<TokenStorage, ApiClient>(
          update: (_, tokenStorage, previous) => ApiClient(tokenStorage: tokenStorage),
        ),
        ChangeNotifierProxyProvider2<ApiClient, TokenStorage, AuthController>(
          create: (ctx) => AuthController(
            apiClient: ctx.read<ApiClient>(),
            tokenStorage: ctx.read<TokenStorage>(),
          ),
          update: (ctx, apiClient, tokenStorage, auth) {
            final instance = auth ?? AuthController(apiClient: apiClient, tokenStorage: tokenStorage);
            instance.updateDependencies(apiClient: apiClient, tokenStorage: tokenStorage);
            return instance;
          },
        ),
        ChangeNotifierProxyProvider2<ApiClient, SocketService, CallManager>(
          create: (ctx) => CallManager(
            apiClient: ctx.read<ApiClient>(),
            socketService: ctx.read<SocketService>(),
          ),
          update: (ctx, apiClient, socketService, callManager) {
            return callManager ?? CallManager(apiClient: apiClient, socketService: socketService);
          },
        ),
      ],
      child: _NotificationFeedbackRegistrar(
        child: Consumer<SettingsController>(
          builder: (context, settings, _) {
            return MaterialApp(
            navigatorKey: appRootNavigatorKey,
            title: AppLocalizations.forLocale(settings.locale).appTitle,
            theme: AppTheme.light(),
            darkTheme: AppTheme.dark(),
            themeMode: settings.themeMode,
            locale: settings.locale,
            supportedLocales: AppLocalizations.supportedLocales,
            localizationsDelegates: const [
              AppLocalizations.delegate,
              _FallbackMaterialLocalizationsDelegate(),
              _FallbackWidgetsLocalizationsDelegate(),
              _FallbackCupertinoLocalizationsDelegate(),
            ],
            themeAnimationDuration: Duration.zero,
            builder: (context, child) {
              final mq = MediaQuery.of(context);
              return _StartupPermissionsRequester(
                child: _AuthExpiryListener(
                  child: _SocketAuthBinder(
                    child: MediaQuery(
                      data: mq.copyWith(
                        textScaler: TextScaler.linear(settings.textScaleFactor),
                      ),
                      child: child ?? const SizedBox.shrink(),
                    ),
                  ),
                ),
              );
            },
            initialRoute: '/splash',
            routes: {
              '/splash': (_) => const SplashScreen(),
              AppGate.routeName: (_) => const AppGate(),
              '/': (_) => const LandingScreen(),
              AppShell.routeName: (_) => const AppShell(),
              LoginScreen.routeName: (_) => const LoginScreen(),
              OtpLoginScreen.routeName: (_) => const OtpLoginScreen(),
              OtpRegisterScreen.routeName: (_) => const OtpRegisterScreen(),
            },
          );
          },
        ),
      ),
    );
  }
}

/// Wires [NotificationService.setForegroundFeedback] to match [AppShell] socket feedback (sound/haptic toggles).
class _NotificationFeedbackRegistrar extends StatefulWidget {
  const _NotificationFeedbackRegistrar({required this.child});

  final Widget child;

  @override
  State<_NotificationFeedbackRegistrar> createState() => _NotificationFeedbackRegistrarState();
}

class _NotificationFeedbackRegistrarState extends State<_NotificationFeedbackRegistrar> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      NotificationService.instance.setForegroundFeedback(_playForegroundPushFeedback);
    });
  }

  @override
  void dispose() {
    NotificationService.instance.setForegroundFeedback(null);
    super.dispose();
  }

  void _playForegroundPushFeedback() {
    if (kIsWeb) return;
    if (defaultTargetPlatform != TargetPlatform.android) return;
    final ctx = appRootNavigatorKey.currentContext;
    if (ctx == null || !ctx.mounted) return;
    final settings = Provider.of<SettingsController>(ctx, listen: false).notifications;
    if (settings.soundEnabled) {
      unawaited(SystemSound.play(SystemSoundType.alert));
    }
    if (settings.vibrationEnabled) {
      HapticFeedback.mediumImpact();
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

class _AuthExpiryListener extends StatefulWidget {
  const _AuthExpiryListener({required this.child});

  final Widget child;

  @override
  State<_AuthExpiryListener> createState() => _AuthExpiryListenerState();
}

class _AuthExpiryListenerState extends State<_AuthExpiryListener> {
  StreamSubscription<void>? _sub;
  bool _navigated = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sub?.cancel();

    final apiClient = Provider.of<ApiClient>(context, listen: false);
    _sub = apiClient.onAuthExpired.listen((_) {
      if (!mounted || _navigated) return;
      _navigated = true;
      final authController = Provider.of<AuthController>(context, listen: false);
      final socket = Provider.of<SocketService>(context, listen: false);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        authController.logout().whenComplete(() {
          socket.disconnect();
          appRootNavigatorKey.currentState?.pushNamedAndRemoveUntil('/', (r) => false);
          _navigated = false;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            final ctx = appRootNavigatorKey.currentContext;
            if (ctx != null && ctx.mounted) {
              showToast(ctx, ctx.l10n.sessionExpiredSignIn, isError: true);
            }
          });
        });
      });
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

class _SocketAuthBinder extends StatefulWidget {
  const _SocketAuthBinder({required this.child});

  final Widget child;

  @override
  State<_SocketAuthBinder> createState() => _SocketAuthBinderState();
}

class _SocketAuthBinderState extends State<_SocketAuthBinder> {
  bool? _last;
  StreamSubscription<IncomingCallData>? _incomingCallSub;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = Provider.of<AuthController>(context, listen: true);
    final current = auth.isAuthenticated;
    if (_last == current) return;
    _last = current;
    Provider.of<SocketService>(context, listen: false).syncAuth(current);
    if (current) {
      final apiClient = Provider.of<ApiClient>(context, listen: false);
      NotificationService.instance.attachTokenSync(apiClient);
      unawaited(() async {
        await NotificationService.instance.ensureNotificationPermission();
        await NotificationService.instance.syncTokenWithBackend(apiClient);
        PushNotificationRouter.retryPending();
      }());
    } else {
      NotificationService.instance.detachTokenSync();
    }

    _incomingCallSub?.cancel();
    if (current) {
      final callManager = Provider.of<CallManager>(context, listen: false);
      _incomingCallSub = callManager.onIncomingCall.listen(_handleIncomingCall);
    }
  }

  void _handleIncomingCall(IncomingCallData data) {
    final navState = appRootNavigatorKey.currentState;
    if (navState == null) return;

    navState.push(
      MaterialPageRoute(
        builder: (_) => IncomingCallScreen(
          callId: data.callId,
          callerName: data.callerName,
          callerId: data.callerId,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _incomingCallSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

class _StartupPermissionsRequester extends StatefulWidget {
  const _StartupPermissionsRequester({required this.child});

  final Widget child;

  @override
  State<_StartupPermissionsRequester> createState() => _StartupPermissionsRequesterState();
}

class _StartupPermissionsRequesterState extends State<_StartupPermissionsRequester> {
  bool _didRequest = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_didRequest) return;
    _didRequest = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      requestStartupPermissions();
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

class _FallbackMaterialLocalizationsDelegate extends LocalizationsDelegate<MaterialLocalizations> {
  const _FallbackMaterialLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) {
    return locale.languageCode == 'en' || locale.languageCode == 'it' || locale.languageCode == 'mt';
  }

  @override
  Future<MaterialLocalizations> load(Locale locale) {
    final effective = locale.languageCode == 'mt' ? const Locale('en') : locale;
    return GlobalMaterialLocalizations.delegate.load(effective);
  }

  @override
  bool shouldReload(covariant LocalizationsDelegate<MaterialLocalizations> old) => false;
}

class _FallbackWidgetsLocalizationsDelegate extends LocalizationsDelegate<WidgetsLocalizations> {
  const _FallbackWidgetsLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) {
    return locale.languageCode == 'en' || locale.languageCode == 'it' || locale.languageCode == 'mt';
  }

  @override
  Future<WidgetsLocalizations> load(Locale locale) {
    final effective = locale.languageCode == 'mt' ? const Locale('en') : locale;
    return GlobalWidgetsLocalizations.delegate.load(effective);
  }

  @override
  bool shouldReload(covariant LocalizationsDelegate<WidgetsLocalizations> old) => false;
}

class _FallbackCupertinoLocalizationsDelegate extends LocalizationsDelegate<Object> {
  const _FallbackCupertinoLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) {
    return locale.languageCode == 'en' || locale.languageCode == 'it' || locale.languageCode == 'mt';
  }

  @override
  Future<Object> load(Locale locale) {
    final effective = locale.languageCode == 'mt' ? const Locale('en') : locale;
    return GlobalCupertinoLocalizations.delegate.load(effective).then((value) => value as Object);
  }

  @override
  bool shouldReload(covariant LocalizationsDelegate<Object> old) => false;
}
