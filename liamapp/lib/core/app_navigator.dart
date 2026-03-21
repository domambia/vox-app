import 'package:flutter/material.dart';

/// Global key for [MaterialApp] so push handling and in-app banners can access
/// the root [Navigator] / [Overlay] without importing [main.dart].
final GlobalKey<NavigatorState> appRootNavigatorKey = GlobalKey<NavigatorState>();
