import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';

import 'screens/landing_screen.dart';
import 'screens/splash_screen.dart';
import 'core/api_client.dart';
import 'core/config.dart';
import 'core/socket_service.dart';
import 'core/token_storage.dart';
import 'features/app/app_gate.dart';
import 'features/app/app_shell.dart';
import 'features/auth/auth_controller.dart';
import 'features/auth/otp_login_screen.dart';
import 'features/auth/otp_register_screen.dart';
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
          update: (_, tokenStorage, __) => SocketService(tokenStorage: tokenStorage),
        ),
        ProxyProvider<TokenStorage, ApiClient>(
          update: (_, tokenStorage, __) => ApiClient(tokenStorage: tokenStorage),
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
      ],
      child: Consumer<SettingsController>(
        builder: (context, settings, _) {
          return MaterialApp(
            title: 'LiamApp',
            theme: AppTheme.light(),
            darkTheme: AppTheme.dark(),
            themeMode: settings.themeMode,
            themeAnimationDuration: Duration.zero,
            builder: (context, child) {
              final mq = MediaQuery.of(context);
              return _AuthExpiryListener(
                child: _SocketAuthBinder(
                  child: MediaQuery(
                    data: mq.copyWith(
                      textScaler: TextScaler.linear(settings.textScaleFactor),
                    ),
                    child: child ?? const SizedBox.shrink(),
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
              OtpLoginScreen.routeName: (_) => const OtpLoginScreen(),
              OtpVerifyScreen.routeName: (_) => const OtpVerifyScreen(),
              OtpRegisterScreen.routeName: (_) => const OtpRegisterScreen(),
              OtpRegisterVerifyScreen.routeName: (_) => const OtpRegisterVerifyScreen(),
            },
          );
        },
      ),
    );
  }
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
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        Provider.of<AuthController>(context, listen: false).logout().whenComplete(() {
          Provider.of<SocketService>(context, listen: false).disconnect();
          if (!mounted) return;
          Navigator.of(context).pushNamedAndRemoveUntil('/', (r) => false);
          _navigated = false;
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

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = Provider.of<AuthController>(context, listen: true);
    final current = auth.isAuthenticated;
    if (_last == current) return;
    _last = current;
    Provider.of<SocketService>(context, listen: false).syncAuth(current);
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
