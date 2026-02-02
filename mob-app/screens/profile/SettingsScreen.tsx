import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import {
  updateAccessibility,
  updateTheme,
  updateNotifications,
  updatePrivacy,
  saveSettings,
  loadSettings,
} from '../../store/slices/settingsSlice';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { OfflineBanner } from '../../components/accessible/OfflineBanner';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { hapticService } from '../../services/accessibility/hapticService';

type SettingsScreenNavigationProp = NativeStackNavigationProp<{
  Settings: undefined;
  KYCVerification: undefined;
}>;

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
  accessibilityLabel?: string;
}

const SettingSection: React.FC<SettingSectionProps> = ({ title, children, accessibilityLabel }) => (
  <View style={styles.section} accessibilityLabel={accessibilityLabel || title}>
    <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
    {children}
  </View>
);

interface SettingItemProps {
  label: string;
  description?: string;
  value?: string | boolean;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  accessibilityHint?: string;
}

const SettingItem: React.FC<SettingItemProps> = ({
  label,
  description,
  value,
  onPress,
  rightElement,
  accessibilityHint,
}) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    accessible={true}
    accessibilityRole="button"
    accessibilityLabel={`${label}${description ? `. ${description}` : ''}${value !== undefined ? `. Current: ${value}` : ''}`}
    accessibilityHint={accessibilityHint}
    onPressIn={() => hapticService.light()}
  >
    <View style={styles.settingItemContent}>
      <View style={styles.settingItemText}>
        <Text style={styles.settingItemLabel}>{label}</Text>
        {description && (
          <Text style={styles.settingItemDescription}>{description}</Text>
        )}
      </View>
      {rightElement || (value !== undefined && (
        <Text style={styles.settingItemValue}>{String(value)}</Text>
      ))}
    </View>
  </TouchableOpacity>
);

/**
 * Settings Screen - User preferences and accessibility settings
 * Voice-first design for accessible settings management
 */
export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state: any) => state.settings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load settings on mount
    dispatch(loadSettings());
  }, [dispatch]);

  useEffect(() => {
    // Announce screen on load
    const announceScreen = async () => {
      setTimeout(async () => {
        await announceToScreenReader(
          'Settings screen. Customize your app experience including accessibility, theme, notifications, and privacy settings.'
        );
      }, 500);
    };
    announceScreen();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    hapticService.success();
    await dispatch(saveSettings(settings));
    await announceToScreenReader('Settings saved');
    setIsSaving(false);
  };

  const handleFontSizeChange = () => {
    const sizes: Array<'small' | 'medium' | 'large' | 'extraLarge'> = ['small', 'medium', 'large', 'extraLarge'];
    const currentIndex = sizes.indexOf(settings.accessibility.fontSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    const newSize = sizes[nextIndex];
    dispatch(updateAccessibility({ fontSize: newSize }));
    announceToScreenReader(`Font size set to ${newSize}`);
    hapticService.light();
  };

  const handleVoiceSpeedChange = (direction: 'increase' | 'decrease') => {
    const step = 0.1;
    const min = 0.5;
    const max = 2.0;
    let newSpeed = settings.accessibility.voiceSpeed;
    
    if (direction === 'increase') {
      newSpeed = Math.min(max, newSpeed + step);
    } else {
      newSpeed = Math.max(min, newSpeed - step);
    }
    
    dispatch(updateAccessibility({ voiceSpeed: newSpeed }));
    announceToScreenReader(`Voice speed set to ${newSpeed.toFixed(1)}`);
    hapticService.light();
  };

  const handleAnnouncementVerbosityChange = () => {
    const levels: Array<'brief' | 'normal' | 'detailed'> = ['brief', 'normal', 'detailed'];
    const currentIndex = levels.indexOf(settings.accessibility.announcementVerbosity);
    const nextIndex = (currentIndex + 1) % levels.length;
    const newLevel = levels[nextIndex];
    dispatch(updateAccessibility({ announcementVerbosity: newLevel }));
    announceToScreenReader(`Announcement verbosity set to ${newLevel}`);
    hapticService.light();
  };

  const handleThemeChange = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(settings.theme.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const newTheme = themes[nextIndex];
    dispatch(updateTheme({ theme: newTheme }));
    announceToScreenReader(`Theme set to ${newTheme}`);
    hapticService.light();
  };

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            hapticService.light();
            navigation.goBack();
          }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Return to previous screen"
        >
          <Ionicons name="arrow-back" size={24} color={AppColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Accessibility Settings */}
        <SettingSection
          title="Accessibility"
          accessibilityLabel="Accessibility settings section"
        >
          <SettingItem
            label="Font Size"
            description="Adjust text size for better readability"
            value={settings.accessibility.fontSize}
            onPress={handleFontSizeChange}
            accessibilityHint="Double tap to cycle through font sizes: small, medium, large, extra large"
          />
          
          <View style={styles.settingItem}>
            <View style={styles.settingItemContent}>
              <View style={styles.settingItemText}>
                <Text style={styles.settingItemLabel}>Voice Speed</Text>
                <Text style={styles.settingItemDescription}>
                  Adjust screen reader speed: {settings.accessibility.voiceSpeed.toFixed(1)}x
                </Text>
              </View>
              <View style={styles.voiceSpeedControls}>
                <TouchableOpacity
                  style={styles.speedButton}
                  onPress={() => handleVoiceSpeedChange('decrease')}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease voice speed"
                  onPressIn={() => hapticService.light()}
                >
                  <Ionicons name="remove" size={20} color={AppColors.primary} />
                </TouchableOpacity>
                <Text style={styles.speedValue}>{settings.accessibility.voiceSpeed.toFixed(1)}x</Text>
                <TouchableOpacity
                  style={styles.speedButton}
                  onPress={() => handleVoiceSpeedChange('increase')}
                  accessibilityRole="button"
                  accessibilityLabel="Increase voice speed"
                  onPressIn={() => hapticService.light()}
                >
                  <Ionicons name="add" size={20} color={AppColors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingItemContent}>
              <View style={styles.settingItemText}>
                <Text style={styles.settingItemLabel}>Haptic Feedback</Text>
                <Text style={styles.settingItemDescription}>
                  Tactile feedback for interactions
                </Text>
              </View>
              <Switch
                value={settings.accessibility.hapticEnabled}
                onValueChange={(value) => {
                  dispatch(updateAccessibility({ hapticEnabled: value }));
                  announceToScreenReader(`Haptic feedback ${value ? 'enabled' : 'disabled'}`);
                  hapticService.light();
                }}
                accessibilityRole="switch"
                accessibilityLabel="Haptic feedback"
                accessibilityState={{ checked: settings.accessibility.hapticEnabled }}
              />
            </View>
          </View>

          <SettingItem
            label="Haptic Intensity"
            description="Strength of haptic feedback"
            value={settings.accessibility.hapticIntensity}
            onPress={() => {
              const intensities: Array<'light' | 'medium' | 'strong'> = ['light', 'medium', 'strong'];
              const currentIndex = intensities.indexOf(settings.accessibility.hapticIntensity);
              const nextIndex = (currentIndex + 1) % intensities.length;
              const newIntensity = intensities[nextIndex];
              dispatch(updateAccessibility({ hapticIntensity: newIntensity }));
              announceToScreenReader(`Haptic intensity set to ${newIntensity}`);
              hapticService.light();
            }}
            accessibilityHint="Double tap to cycle through intensities: light, medium, strong"
          />

          <SettingItem
            label="Announcement Verbosity"
            description="Level of detail in screen reader announcements"
            value={settings.accessibility.announcementVerbosity}
            onPress={handleAnnouncementVerbosityChange}
            accessibilityHint="Double tap to cycle through verbosity levels: brief, normal, detailed"
          />

          <View style={styles.settingItem}>
            <View style={styles.settingItemContent}>
              <View style={styles.settingItemText}>
                <Text style={styles.settingItemLabel}>Image Descriptions</Text>
                <Text style={styles.settingItemDescription}>
                  Enable automatic image descriptions
                </Text>
              </View>
              <Switch
                value={settings.accessibility.enableImageDescriptions}
                onValueChange={(value) => {
                  dispatch(updateAccessibility({ enableImageDescriptions: value }));
                  announceToScreenReader(`Image descriptions ${value ? 'enabled' : 'disabled'}`);
                  hapticService.light();
                }}
                accessibilityRole="switch"
                accessibilityLabel="Image descriptions"
                accessibilityState={{ checked: settings.accessibility.enableImageDescriptions }}
              />
            </View>
          </View>
        </SettingSection>

        {/* Theme Settings */}
        <SettingSection
          title="Appearance"
          accessibilityLabel="Appearance and theme settings section"
        >
          <SettingItem
            label="Theme"
            description="Choose light, dark, or system theme"
            value={settings.theme.theme}
            onPress={handleThemeChange}
            accessibilityHint="Double tap to cycle through themes: light, dark, system"
          />

          <View style={styles.settingItem}>
            <View style={styles.settingItemContent}>
              <View style={styles.settingItemText}>
                <Text style={styles.settingItemLabel}>High Contrast</Text>
                <Text style={styles.settingItemDescription}>
                  Increase contrast for better visibility
                </Text>
              </View>
              <Switch
                value={settings.theme.highContrast}
                onValueChange={(value) => {
                  dispatch(updateTheme({ highContrast: value }));
                  announceToScreenReader(`High contrast ${value ? 'enabled' : 'disabled'}`);
                  hapticService.light();
                }}
                accessibilityRole="switch"
                accessibilityLabel="High contrast mode"
                accessibilityState={{ checked: settings.theme.highContrast }}
              />
            </View>
          </View>
        </SettingSection>

        {/* Notification Settings */}
        <SettingSection
          title="Notifications"
          accessibilityLabel="Notification settings section"
        >
          <View style={styles.settingItem}>
            <View style={styles.settingItemContent}>
              <View style={styles.settingItemText}>
                <Text style={styles.settingItemLabel}>Message Notifications</Text>
                <Text style={styles.settingItemDescription}>
                  Get notified of new messages
                </Text>
              </View>
              <Switch
                value={settings.notifications.messageNotifications}
                onValueChange={(value) => {
                  dispatch(updateNotifications({ messageNotifications: value }));
                  announceToScreenReader(`Message notifications ${value ? 'enabled' : 'disabled'}`);
                  hapticService.light();
                }}
                accessibilityRole="switch"
                accessibilityLabel="Message notifications"
                accessibilityState={{ checked: settings.notifications.messageNotifications }}
              />
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingItemContent}>
              <View style={styles.settingItemText}>
                <Text style={styles.settingItemLabel}>Match Notifications</Text>
                <Text style={styles.settingItemDescription}>
                  Get notified of new matches
                </Text>
              </View>
              <Switch
                value={settings.notifications.matchNotifications}
                onValueChange={(value) => {
                  dispatch(updateNotifications({ matchNotifications: value }));
                  announceToScreenReader(`Match notifications ${value ? 'enabled' : 'disabled'}`);
                  hapticService.light();
                }}
                accessibilityRole="switch"
                accessibilityLabel="Match notifications"
                accessibilityState={{ checked: settings.notifications.matchNotifications }}
              />
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingItemContent}>
              <View style={styles.settingItemText}>
                <Text style={styles.settingItemLabel}>Sound</Text>
                <Text style={styles.settingItemDescription}>
                  Play sound for notifications
                </Text>
              </View>
              <Switch
                value={settings.notifications.soundEnabled}
                onValueChange={(value) => {
                  dispatch(updateNotifications({ soundEnabled: value }));
                  announceToScreenReader(`Notification sound ${value ? 'enabled' : 'disabled'}`);
                  hapticService.light();
                }}
                accessibilityRole="switch"
                accessibilityLabel="Notification sound"
                accessibilityState={{ checked: settings.notifications.soundEnabled }}
              />
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingItemContent}>
              <View style={styles.settingItemText}>
                <Text style={styles.settingItemLabel}>Vibration</Text>
                <Text style={styles.settingItemDescription}>
                  Vibrate for notifications
                </Text>
              </View>
              <Switch
                value={settings.notifications.vibrationEnabled}
                onValueChange={(value) => {
                  dispatch(updateNotifications({ vibrationEnabled: value }));
                  announceToScreenReader(`Notification vibration ${value ? 'enabled' : 'disabled'}`);
                  hapticService.light();
                }}
                accessibilityRole="switch"
                accessibilityLabel="Notification vibration"
                accessibilityState={{ checked: settings.notifications.vibrationEnabled }}
              />
            </View>
          </View>
        </SettingSection>

        {/* Account / Verification */}
        <SettingSection
          title="Account"
          accessibilityLabel="Account and verification section"
        >
          <SettingItem
            label="Verify identity"
            description="KYC verification status and document submission"
            onPress={() => {
              hapticService.light();
              navigation.navigate('KYCVerification');
            }}
            accessibilityHint="Open identity verification screen"
          />
        </SettingSection>

        {/* Privacy Settings */}
        <SettingSection
          title="Privacy"
          accessibilityLabel="Privacy settings section"
        >
          <View style={styles.settingItem}>
            <View style={styles.settingItemContent}>
              <View style={styles.settingItemText}>
                <Text style={styles.settingItemLabel}>Show Online Status</Text>
                <Text style={styles.settingItemDescription}>
                  Let others see when you're online
                </Text>
              </View>
              <Switch
                value={settings.privacy.showOnlineStatus}
                onValueChange={(value) => {
                  dispatch(updatePrivacy({ showOnlineStatus: value }));
                  announceToScreenReader(`Online status ${value ? 'visible' : 'hidden'}`);
                  hapticService.light();
                }}
                accessibilityRole="switch"
                accessibilityLabel="Show online status"
                accessibilityState={{ checked: settings.privacy.showOnlineStatus }}
              />
            </View>
          </View>

          <SettingItem
            label="Allow Messages From"
            description="Control who can message you"
            value={settings.privacy.allowMessagesFrom}
            onPress={() => {
              const options: Array<'everyone' | 'matches' | 'none'> = ['everyone', 'matches', 'none'];
              const currentIndex = options.indexOf(settings.privacy.allowMessagesFrom);
              const nextIndex = (currentIndex + 1) % options.length;
              const newOption = options[nextIndex];
              dispatch(updatePrivacy({ allowMessagesFrom: newOption }));
              announceToScreenReader(`Messages allowed from ${newOption}`);
              hapticService.light();
            }}
            accessibilityHint="Double tap to cycle through options: everyone, matches, none"
          />
        </SettingSection>

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <AccessibleButton
            title={isSaving ? "Saving..." : "Save Settings"}
            onPress={handleSave}
            variant="primary"
            accessibilityHint="Save all settings changes"
            loading={isSaving}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.text,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 12,
  },
  settingItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  settingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingItemText: {
    flex: 1,
    marginRight: 16,
  },
  settingItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: AppColors.text,
    marginBottom: 4,
  },
  settingItemDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  settingItemValue: {
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: '500',
  },
  voiceSpeedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  speedButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedValue: {
    fontSize: 16,
    fontWeight: '500',
    color: AppColors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  saveButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
});
