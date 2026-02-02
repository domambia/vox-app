import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { OfflineBanner } from '../../components/accessible/OfflineBanner';
import { EmptyState } from '../../components/accessible/EmptyState';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { hapticService } from '../../services/accessibility/hapticService';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector as useAppSelectorHook } from '../../hooks/useAppSelector';
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  Notification,
} from '../../store/slices/notificationsSlice';
import type { ProfileStackParamList } from '../../navigation/MainNavigator';

type NotificationsScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Notifications'>;

/**
 * Notifications Screen - Central hub for all app notifications
 * Voice-first design for accessible notification management
 */
export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NotificationsScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { notifications, unreadCount, isLoading } = useAppSelectorHook((state: any) => state.notifications);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  useEffect(() => {
    const announceScreen = async () => {
      setTimeout(async () => {
        await announceToScreenReader(
          `Notifications screen. ${notifications.length} notifications. ${unreadCount} unread.`
        );
      }, 500);
    };
    announceScreen();
  }, [notifications.length, unreadCount]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await announceToScreenReader('Refreshing notifications');
    await dispatch(fetchNotifications());
    setRefreshing(false);
    await announceToScreenReader('Notifications updated');
  };

  const handleNotificationPress = async (notification: Notification) => {
    hapticService.light();
    if (!notification.read) {
      await dispatch(markAsRead(notification.notificationId));
    }

    const tabNav = (navigation.getParent() as any)?.getParent();
    if (!tabNav) return;

    switch (notification.type) {
      case 'message':
        if (notification.conversationId || notification.userId) {
          announceToScreenReader('Opening conversation');
          tabNav.dispatch(
            CommonActions.navigate({
              name: 'Messages',
              params: {
                screen: 'Chat',
                params: {
                  conversationId: notification.conversationId,
                  participantId: notification.userId,
                  participantName: notification.participantName || 'User',
                },
              },
            })
          );
        }
        break;
      case 'match':
      case 'like':
        if (notification.userId) {
          announceToScreenReader('Opening profile');
          tabNav.dispatch(
            CommonActions.navigate({
              name: 'Discover',
              params: {
                screen: 'ProfileDetail',
                params: { userId: notification.userId },
              },
            })
          );
        }
        break;
      case 'event':
        if (notification.eventId) {
          announceToScreenReader('Opening event');
          tabNav.dispatch(
            CommonActions.navigate({
              name: 'Events',
              params: {
                screen: 'EventDetail',
                params: { eventId: notification.eventId },
              },
            })
          );
        }
        break;
      case 'group':
        if (notification.groupId) {
          announceToScreenReader('Opening group');
          tabNav.dispatch(
            CommonActions.navigate({
              name: 'Groups',
              params: {
                screen: 'GroupChat',
                params: { groupId: notification.groupId, groupName: 'Group' },
              },
            })
          );
        }
        break;
      default:
        announceToScreenReader('Notification opened');
    }
  };

  const handleMarkAllAsRead = async () => {
    hapticService.success();
    await dispatch(markAllAsRead());
    await announceToScreenReader('All notifications marked as read');
  };

  const handleDelete = async (notificationId: string) => {
    hapticService.light();
    await dispatch(deleteNotification(notificationId));
    await announceToScreenReader('Notification deleted');
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return 'chatbubble';
      case 'match':
        return 'heart';
      case 'like':
        return 'heart-outline';
      case 'event':
        return 'calendar';
      case 'group':
        return 'people';
      default:
        return 'notifications';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.message}. ${formatTimeAgo(item.createdAt)}. ${item.read ? 'Read' : 'Unread'}`}
      accessibilityHint="Double tap to open notification"
    >
      <View style={styles.notificationContent}>
        <View style={[styles.iconContainer, styles[`${item.type}Icon`]]}>
          <Ionicons name={getNotificationIcon(item.type) as any} size={24} color={AppColors.white} />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.notificationTime} accessibilityRole="text">
            {formatTimeAgo(item.createdAt)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.notificationId)}
          accessibilityRole="button"
          accessibilityLabel="Delete notification"
          accessibilityHint="Delete this notification"
        >
          <Ionicons name="close" size={20} color={AppColors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <EmptyState
      icon="notifications-outline"
      title="No Notifications"
      description="You're all caught up! When you receive notifications, they'll appear here."
      accessibilityLabel="No notifications. You're all caught up."
    />
  );

  const filteredNotifications = notifications;

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
        <Text style={styles.headerTitle} accessibilityRole="header">
          Notifications
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
            accessibilityRole="button"
            accessibilityLabel={`Mark all ${unreadCount} notifications as read`}
            accessibilityHint="Mark all notifications as read"
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={styles.headerRight} />}
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadBannerText} accessibilityRole="text">
            {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.notificationId}
        renderItem={renderNotificationItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            accessibilityLabel="Pull to refresh notifications"
          />
        }
        style={styles.notificationsList}
        showsVerticalScrollIndicator={false}
        accessibilityLabel={`Notifications list. ${filteredNotifications.length} notifications`}
        contentContainerStyle={filteredNotifications.length === 0 ? { flex: 1 } : undefined}
      />
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
    flex: 1,
    marginLeft: 8,
  },
  markAllButton: {
    padding: 8,
  },
  markAllText: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: '500',
  },
  headerRight: {
    width: 60,
  },
  unreadBanner: {
    backgroundColor: AppColors.inputBg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  unreadBannerText: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: '500',
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: AppColors.border,
  },
  unreadNotification: {
    backgroundColor: AppColors.borderLight,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  messageIcon: {
    backgroundColor: AppColors.primary,
  },
  matchIcon: {
    backgroundColor: AppColors.success,
  },
  likeIcon: {
    backgroundColor: AppColors.warning,
  },
  eventIcon: {
    backgroundColor: AppColors.primaryDark,
  },
  groupIcon: {
    backgroundColor: AppColors.primary,
  },
  systemIcon: {
    backgroundColor: AppColors.textSecondary,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.primary,
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: AppColors.placeholder,
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
  },
});
