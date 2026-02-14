import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../auth/auth_controller.dart';

class AppGate extends StatefulWidget {
  const AppGate({super.key});

  static const routeName = '/gate';

  @override
  State<AppGate> createState() => _AppGateState();
}

class _AppGateState extends State<AppGate> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final auth = Provider.of<AuthController>(context, listen: false);
      if (!auth.isInitialized) {
        await auth.initialize();
      }

      if (!mounted) return;
      if (auth.isAuthenticated) {
        Navigator.of(context).pushNamedAndRemoveUntil('/app', (r) => false);
      } else {
        Navigator.of(context).pushNamedAndRemoveUntil('/', (r) => false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(
        child: Center(
          child: CircularProgressIndicator(),
        ),
      ),
    );
  }
}
