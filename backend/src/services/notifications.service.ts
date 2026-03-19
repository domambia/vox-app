import matchService from '@/services/match.service';
import eventService from '@/services/event.service';
import prisma from '@/config/database';
import { logger } from '@/utils/logger';

export type NotificationType = 'match' | 'like' | 'message' | 'event' | 'system' | 'post';

export interface NotificationItem {
  notification_id: string;
  type: NotificationType;
  title: string;
  message: string;
  user_id?: string;
  event_id?: string;
  conversation_id?: string;
  post_id?: string;
  participant_name?: string;
  read: boolean;
  created_at: string;
}

/**
 * Aggregate notifications from matches, likes, conversations, and upcoming events.
 * No dedicated notifications table; derived from existing data.
 */
function toIso(date: Date | string | undefined, fallback: string): string {
  if (!date) return fallback;
  return typeof date === 'string' ? date : (date as Date).toISOString?.() ?? fallback;
}

export class NotificationsService {
  async listNotifications(userId: string, limit: number = 50): Promise<NotificationItem[]> {
    try {
      const now = new Date().toISOString();

      // DB-backed notifications (message/post/etc).
      const dbNotifications = await prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: Math.max(10, limit),
      });

      const notifications: NotificationItem[] = dbNotifications.map((n) => ({
        notification_id: n.notification_id,
        type: n.type as NotificationType,
        title: n.title,
        message: n.message,
        user_id: n.user_id,
        conversation_id: n.conversation_id ?? undefined,
        post_id: n.post_id ?? undefined,
        read: n.read_at != null,
        created_at: toIso(n.created_at, now),
      }));

      // Derived notifications (match/like/event). Messages are stored in DB now.
      const [matches, likesReceived, userEventsRsvps] = await Promise.all([
        matchService.getMatches(userId),
        matchService.getLikesReceived(userId),
        eventService.getUserEvents(userId, true),
      ]);

      // Matches
      const matchList = Array.isArray(matches) ? matches : [];
      matchList.slice(0, 20).forEach((m: any) => {
        const other = m.other_user ?? m.user ?? m;
        const name = [other.first_name, other.last_name].filter(Boolean).join(' ') || 'Someone';
        const uid = other.user_id ?? other.userId;
        notifications.push({
          notification_id: `match-${m.match_id ?? m.matchId ?? uid}`,
          type: 'match',
          title: 'New Match!',
          message: `You and ${name} liked each other`,
          user_id: uid,
          read: false,
          created_at: toIso(m.matched_at ?? m.matchedAt, now),
        });
      });

      // Likes received
      const likesList = Array.isArray(likesReceived) ? likesReceived : [];
      likesList.slice(0, 20).forEach((l: any) => {
        const profile = l.profile ?? l.liker ?? l;
        const user = profile.user_id ? profile : (l.liker ?? l);
        const name = [user.first_name ?? profile.first_name, user.last_name ?? profile.last_name].filter(Boolean).join(' ') || 'Someone';
        const uid = user.user_id ?? user.userId ?? profile.user_id;
        notifications.push({
          notification_id: `like-${l.like_id ?? l.likeId ?? uid}`,
          type: 'like',
          title: 'Someone liked you',
          message: `${name} liked your profile`,
          user_id: uid,
          read: false,
          created_at: toIso(l.created_at ?? l.createdAt, now),
        });
      });

      // Upcoming events (next 24h)
      const events = Array.isArray(userEventsRsvps) ? userEventsRsvps.map((r: any) => r.event ?? r) : [];
      events.slice(0, 10).forEach((ev: any) => {
        const eventTime = new Date(ev.date_time ?? ev.startTime ?? ev.dateTime ?? now);
        const in24h = eventTime.getTime() - Date.now() < 24 * 60 * 60 * 1000 && eventTime.getTime() > Date.now();
        if (!in24h) return;
        notifications.push({
          notification_id: `event-${ev.event_id ?? ev.eventId}`,
          type: 'event',
          title: 'Event reminder',
          message: `${ev.title ?? 'Event'} starts soon`,
          event_id: ev.event_id ?? ev.eventId,
          read: false,
          created_at: toIso(ev.date_time ?? ev.startTime, now),
        });
      });

      notifications.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      return notifications.slice(0, limit);
    } catch (error) {
      logger.error('Error listing notifications', error);
      throw error;
    }
  }

  async markAsRead(
    userId: string,
    notificationIds?: string[],
  ): Promise<{ count: number }> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          user_id: userId,
          read_at: null,
          ...(notificationIds && notificationIds.length > 0
            ? { notification_id: { in: notificationIds } }
            : {}),
        },
        data: { read_at: new Date() },
      });

      return { count: result.count };
    } catch (error) {
      logger.error('Error marking notifications as read', error);
      throw error;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return prisma.notification.count({
        where: { user_id: userId, read_at: null },
      });
    } catch (error) {
      logger.error('Error getting unread notifications count', error);
      throw error;
    }
  }
}

const notificationsService = new NotificationsService();
export default notificationsService;
