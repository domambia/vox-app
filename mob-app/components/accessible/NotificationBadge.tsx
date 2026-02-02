import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../hooks/useAppSelector';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { hapticService } from '../../services/accessibility/hapticService';

/**
 * Notification Badge Component
 * Shows unread notification count and navigates to notifications screen
 */
export const NotificationBadge: React.FC = () => {
  const navigation = useNavigation();
  const unreadCount = useAppSelector((state: any) => state.notifications?.unreadCount || 0);

  const handlePress = () => {
    hapticService.light();
    announceToScreenReader(`Opening notifications. ${unreadCount} unread.`);
    navigation.navigate('Notifications' as never);
  };

  if (unreadCount === 0) {
    return (
      <TouchableOpacity
        style={styles.iconButton}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        accessibilityHint="View all notifications"
      >
        <Ionicons name="notifications-outline" size={24} color={AppColors.primary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Notifications. ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`}
      accessibilityHint="View notifications"
    >
      <View style={styles.badgeContainer}>
        <Ionicons name="notifications" size={24} color={AppColors.primary} />
        <View style={styles.badge}>
          <Text style={styles.badgeText} accessibilityLabel={`${unreadCount} unread`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  iconButton: {
    padding: 8,
  },
  badgeContainer: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: AppColors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: AppColors.white,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.white,
  },
});
