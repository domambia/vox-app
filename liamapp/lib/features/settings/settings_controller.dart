import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsController extends ChangeNotifier {
  SettingsController() {
    _load();
  }

  static const _storageKey = 'vox_settings';

  bool _loaded = false;
  bool get isLoaded => _loaded;

  AccessibilitySettings accessibility = const AccessibilitySettings();
  ThemeSettings theme = const ThemeSettings();
  NotificationSettings notifications = const NotificationSettings();
  PrivacySettings privacy = const PrivacySettings();

  ThemeMode get themeMode {
    switch (theme.theme) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  double get textScaleFactor {
    switch (accessibility.fontSize) {
      case 'small':
        return 0.9;
      case 'large':
        return 1.15;
      case 'extraLarge':
        return 1.3;
      default:
        return 1.0;
    }
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    if (raw == null || raw.trim().isEmpty) {
      _loaded = true;
      notifyListeners();
      return;
    }

    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map) {
        final a = decoded['accessibility'];
        final t = decoded['theme'];
        final n = decoded['notifications'];
        final p = decoded['privacy'];

        accessibility = AccessibilitySettings.fromJson(a);
        theme = ThemeSettings.fromJson(t);
        notifications = NotificationSettings.fromJson(n);
        privacy = PrivacySettings.fromJson(p);
      }
    } catch (_) {
      // ignore
    }

    _loaded = true;
    notifyListeners();
  }

  Future<void> _save() async {
    final prefs = await SharedPreferences.getInstance();
    final payload = {
      'accessibility': accessibility.toJson(),
      'theme': theme.toJson(),
      'notifications': notifications.toJson(),
      'privacy': privacy.toJson(),
    };
    await prefs.setString(_storageKey, jsonEncode(payload));
  }

  Future<void> updateAccessibility(AccessibilitySettings next) async {
    accessibility = next;
    notifyListeners();
    await _save();
  }

  Future<void> updateTheme(ThemeSettings next) async {
    theme = next;
    notifyListeners();
    await _save();
  }

  Future<void> updateNotifications(NotificationSettings next) async {
    notifications = next;
    notifyListeners();
    await _save();
  }

  Future<void> updatePrivacy(PrivacySettings next) async {
    privacy = next;
    notifyListeners();
    await _save();
  }

  Future<void> reset() async {
    accessibility = const AccessibilitySettings();
    theme = const ThemeSettings();
    notifications = const NotificationSettings();
    privacy = const PrivacySettings();
    notifyListeners();
    await _save();
  }
}

@immutable
class AccessibilitySettings {
  const AccessibilitySettings({
    this.fontSize = 'medium',
    this.voiceSpeed = 1.0,
    this.hapticEnabled = true,
    this.hapticIntensity = 'medium',
    this.announcementVerbosity = 'normal',
    this.enableImageDescriptions = true,
  });

  final String fontSize; // small|medium|large|extraLarge
  final double voiceSpeed; // 0.5 - 2.0
  final bool hapticEnabled;
  final String hapticIntensity; // light|medium|strong
  final String announcementVerbosity; // brief|normal|detailed
  final bool enableImageDescriptions;

  AccessibilitySettings copyWith({
    String? fontSize,
    double? voiceSpeed,
    bool? hapticEnabled,
    String? hapticIntensity,
    String? announcementVerbosity,
    bool? enableImageDescriptions,
  }) {
    return AccessibilitySettings(
      fontSize: fontSize ?? this.fontSize,
      voiceSpeed: voiceSpeed ?? this.voiceSpeed,
      hapticEnabled: hapticEnabled ?? this.hapticEnabled,
      hapticIntensity: hapticIntensity ?? this.hapticIntensity,
      announcementVerbosity: announcementVerbosity ?? this.announcementVerbosity,
      enableImageDescriptions: enableImageDescriptions ?? this.enableImageDescriptions,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'fontSize': fontSize,
      'voiceSpeed': voiceSpeed,
      'hapticEnabled': hapticEnabled,
      'hapticIntensity': hapticIntensity,
      'announcementVerbosity': announcementVerbosity,
      'enableImageDescriptions': enableImageDescriptions,
    };
  }

  static AccessibilitySettings fromJson(dynamic json) {
    if (json is! Map) return const AccessibilitySettings();
    final rawVoice = json['voiceSpeed'];
    final voiceSpeed = rawVoice is num ? rawVoice.toDouble() : 1.0;
    return AccessibilitySettings(
      fontSize: (json['fontSize'] ?? 'medium').toString(),
      voiceSpeed: voiceSpeed.clamp(0.5, 2.0),
      hapticEnabled: json['hapticEnabled'] == false ? false : true,
      hapticIntensity: (json['hapticIntensity'] ?? 'medium').toString(),
      announcementVerbosity: (json['announcementVerbosity'] ?? 'normal').toString(),
      enableImageDescriptions: json['enableImageDescriptions'] == false ? false : true,
    );
  }
}

@immutable
class ThemeSettings {
  const ThemeSettings({
    this.theme = 'system',
    this.highContrast = false,
  });

  final String theme; // light|dark|system
  final bool highContrast;

  ThemeSettings copyWith({String? theme, bool? highContrast}) {
    return ThemeSettings(
      theme: theme ?? this.theme,
      highContrast: highContrast ?? this.highContrast,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'theme': theme,
      'highContrast': highContrast,
    };
  }

  static ThemeSettings fromJson(dynamic json) {
    if (json is! Map) return const ThemeSettings();
    return ThemeSettings(
      theme: (json['theme'] ?? 'system').toString(),
      highContrast: json['highContrast'] == true,
    );
  }
}

@immutable
class NotificationSettings {
  const NotificationSettings({
    this.messageNotifications = true,
    this.matchNotifications = true,
    this.eventNotifications = true,
    this.groupNotifications = true,
    this.soundEnabled = true,
    this.vibrationEnabled = true,
  });

  final bool messageNotifications;
  final bool matchNotifications;
  final bool eventNotifications;
  final bool groupNotifications;
  final bool soundEnabled;
  final bool vibrationEnabled;

  NotificationSettings copyWith({
    bool? messageNotifications,
    bool? matchNotifications,
    bool? eventNotifications,
    bool? groupNotifications,
    bool? soundEnabled,
    bool? vibrationEnabled,
  }) {
    return NotificationSettings(
      messageNotifications: messageNotifications ?? this.messageNotifications,
      matchNotifications: matchNotifications ?? this.matchNotifications,
      eventNotifications: eventNotifications ?? this.eventNotifications,
      groupNotifications: groupNotifications ?? this.groupNotifications,
      soundEnabled: soundEnabled ?? this.soundEnabled,
      vibrationEnabled: vibrationEnabled ?? this.vibrationEnabled,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'messageNotifications': messageNotifications,
      'matchNotifications': matchNotifications,
      'eventNotifications': eventNotifications,
      'groupNotifications': groupNotifications,
      'soundEnabled': soundEnabled,
      'vibrationEnabled': vibrationEnabled,
    };
  }

  static NotificationSettings fromJson(dynamic json) {
    if (json is! Map) return const NotificationSettings();
    return NotificationSettings(
      messageNotifications: json['messageNotifications'] == false ? false : true,
      matchNotifications: json['matchNotifications'] == false ? false : true,
      eventNotifications: json['eventNotifications'] == false ? false : true,
      groupNotifications: json['groupNotifications'] == false ? false : true,
      soundEnabled: json['soundEnabled'] == false ? false : true,
      vibrationEnabled: json['vibrationEnabled'] == false ? false : true,
    );
  }
}

@immutable
class PrivacySettings {
  const PrivacySettings({
    this.showOnlineStatus = true,
    this.showLastSeen = true,
    this.allowProfileViews = true,
    this.allowMessagesFrom = 'everyone',
  });

  final bool showOnlineStatus;
  final bool showLastSeen;
  final bool allowProfileViews;
  final String allowMessagesFrom; // everyone|matches|none

  PrivacySettings copyWith({
    bool? showOnlineStatus,
    bool? showLastSeen,
    bool? allowProfileViews,
    String? allowMessagesFrom,
  }) {
    return PrivacySettings(
      showOnlineStatus: showOnlineStatus ?? this.showOnlineStatus,
      showLastSeen: showLastSeen ?? this.showLastSeen,
      allowProfileViews: allowProfileViews ?? this.allowProfileViews,
      allowMessagesFrom: allowMessagesFrom ?? this.allowMessagesFrom,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'showOnlineStatus': showOnlineStatus,
      'showLastSeen': showLastSeen,
      'allowProfileViews': allowProfileViews,
      'allowMessagesFrom': allowMessagesFrom,
    };
  }

  static PrivacySettings fromJson(dynamic json) {
    if (json is! Map) return const PrivacySettings();
    return PrivacySettings(
      showOnlineStatus: json['showOnlineStatus'] == false ? false : true,
      showLastSeen: json['showLastSeen'] == false ? false : true,
      allowProfileViews: json['allowProfileViews'] == false ? false : true,
      allowMessagesFrom: (json['allowMessagesFrom'] ?? 'everyone').toString(),
    );
  }
}
