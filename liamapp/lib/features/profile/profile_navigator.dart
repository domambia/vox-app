import 'package:flutter/material.dart';

import 'edit_profile_screen.dart';
import 'notifications_screen.dart';
import 'profile_home_screen.dart';
import 'settings_screen.dart';
import '../calls/call_history_screen.dart';
import '../kyc/kyc_history_screen.dart';
import '../kyc/kyc_home_screen.dart';
import '../kyc/kyc_initiate_screen.dart';
import '../kyc/kyc_schedule_call_screen.dart';
import '../kyc/kyc_upload_document_screen.dart';

class ProfileNavigator extends StatelessWidget {
  const ProfileNavigator({super.key, required this.navigatorKey});

  final GlobalKey<NavigatorState> navigatorKey;

  @override
  Widget build(BuildContext context) {
    return Navigator(
      key: navigatorKey,
      initialRoute: ProfileHomeScreen.routeName,
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case ProfileHomeScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const ProfileHomeScreen(),
            );
          case EditProfileScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const EditProfileScreen(),
            );
          case NotificationsScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const NotificationsScreen(),
            );
          case SettingsScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const SettingsScreen(),
            );
          case CallHistoryScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const CallHistoryScreen(),
            );
          case KycHomeScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const KycHomeScreen(),
            );
          case KycInitiateScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const KycInitiateScreen(),
            );
          case KycUploadDocumentScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const KycUploadDocumentScreen(),
            );
          case KycScheduleCallScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const KycScheduleCallScreen(),
            );
          case KycHistoryScreen.routeName:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const KycHistoryScreen(),
            );
          default:
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const ProfileHomeScreen(),
            );
        }
      },
    );
  }
}
