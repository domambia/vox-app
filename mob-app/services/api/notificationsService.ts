import { apiClient } from './apiClient';
import { AxiosResponse } from 'axios';

export type NotificationType = 'message' | 'match' | 'like' | 'event' | 'group' | 'system';

export interface NotificationItem {
  notificationId: string;
  type: NotificationType;
  title: string;
  message: string;
  userId?: string;
  eventId?: string;
  groupId?: string;
  conversationId?: string;
  participantName?: string;
  read: boolean;
  createdAt: string;
}

function mapBackendNotification(raw: any): NotificationItem {
  const n = raw?.notification ?? raw;
  return {
    notificationId: n.notification_id ?? n.notificationId ?? '',
    type: (n.type ?? 'system') as NotificationType,
    title: n.title ?? '',
    message: n.message ?? '',
    userId: n.user_id ?? n.userId,
    eventId: n.event_id ?? n.eventId,
    groupId: n.group_id ?? n.groupId,
    conversationId: n.conversation_id ?? n.conversationId,
    participantName: n.participant_name ?? n.participantName,
    read: n.read ?? false,
    createdAt: n.created_at ?? n.createdAt ?? '',
  };
}

/**
 * GET /api/v1/notifications – aggregated notifications (matches, likes, conversations, events).
 * Backend may not have this route; use as optional and fallback to client-side aggregation.
 */
export async function getNotifications(params?: { limit?: number }): Promise<NotificationItem[]> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  const url = `/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response: AxiosResponse = await apiClient.get(url);
  const data = response.data?.data ?? response.data;
  const items = data?.items ?? data?.notifications ?? [];
  return Array.isArray(items) ? items.map(mapBackendNotification) : [];
}

export const notificationsService = {
  getNotifications,
};
