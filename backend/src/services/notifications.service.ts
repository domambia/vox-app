import matchService from '@/services/match.service';
import messagingService from '@/services/messaging.service';
import eventService from '@/services/event.service';
import { logger } from '@/utils/logger';

export type NotificationType = 'match' | 'like' | 'message' | 'event' | 'system';

export interface NotificationItem {
  notification_id: string;
  type: NotificationType;
  title: string;
  message: string;
  user_id?: string;
  event_id?: string;
  conversation_id?: string;
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
      const notifications: NotificationItem[] = [];
      const now = new Date().toISOString();

      const [matches, likesReceived, convResult, userEventsRsvps] = await Promise.all([
        matchService.getMatches(userId),
        matchService.getLikesReceived(userId),
        messagingService.listConversations(userId, { limit: 30, offset: 0 }),
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

      // Conversations (last message as notification)
      const convs = convResult?.items ?? [];
      convs.forEach((c: any) => {
        const other = c.other_user ?? c.participant ?? {};
        const name = [other.first_name, other.last_name].filter(Boolean).join(' ') || 'Someone';
        const last = c.last_message ?? c.lastMessage;
        const preview = last?.content ? last.content.slice(0, 50) + (last.content.length > 50 ? '…' : '') : 'New message';
        const unread = c.unread_count ?? c.unreadCount ?? 0;
        notifications.push({
          notification_id: `msg-${c.conversation_id ?? c.conversationId}`,
          type: 'message',
          title: unread > 0 ? `New message from ${name}` : name,
          message: preview,
          user_id: other.user_id ?? other.userId,
          conversation_id: c.conversation_id ?? c.conversationId,
          participant_name: name,
          read: unread === 0,
          created_at: toIso(c.last_message_at ?? c.lastMessageAt ?? c.created_at, now),
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

      notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return notifications.slice(0, limit);
    } catch (error) {
      logger.error('Error listing notifications', error);
      throw error;
    }
  }
}

const notificationsService = new NotificationsService();
export default notificationsService;
