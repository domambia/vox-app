import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { notificationsService } from "../../services/api/notificationsService";
import { discoveryService } from "../../services/api/discoveryService";
import { messagingService } from "../../services/api/messagingService";
import { eventsService } from "../../services/api/eventsService";

export type NotificationType =
  | "message"
  | "match"
  | "like"
  | "event"
  | "group"
  | "system";

export interface Notification {
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
  actionUrl?: string;
}

export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

/** Fetch notifications: try GET /notifications first; fallback to client-side aggregation. */
export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const userId = state.auth?.user?.userId;
      if (!userId) return [];

      try {
        const items = await notificationsService.getNotifications({ limit: 50 });
        return items as Notification[];
      } catch (_) {
        // Backend may not have /notifications; fallback to client-side aggregation
      }

      const notifications: Notification[] = [];
      const now = new Date().toISOString();

      const [matchesRes, likesRes, convRes, userEventsRes] = await Promise.all([
        discoveryService.getMatches({ limit: 20 }),
        discoveryService.getLikes({ type: "received", limit: 20 }),
        messagingService.listConversations({ limit: 30 }),
        eventsService.getUserEvents(userId, { upcomingOnly: true }),
      ]);

      const matches = matchesRes?.data ?? matchesRes?.matches ?? [];
      matches.forEach((m: any) => {
        const other = m.other_user ?? m.user ?? m;
        const name =
          [
            other.first_name ?? other.firstName,
            other.last_name ?? other.lastName,
          ]
            .filter(Boolean)
            .join(" ") || "Someone";
        const uid = other.user_id ?? other.userId;
        notifications.push({
          notificationId: `match-${m.match_id ?? m.matchId ?? uid}`,
          type: "match",
          title: "New Match!",
          message: `You and ${name} liked each other`,
          userId: uid,
          read: false,
          createdAt: m.matched_at ?? m.matchedAt ?? now,
        });
      });

      const likes = likesRes?.data ?? [];
      likes.forEach((l: any) => {
        const profile = l.profile ?? l;
        const name =
          [
            profile.first_name ?? profile.firstName,
            profile.last_name ?? profile.lastName,
          ]
            .filter(Boolean)
            .join(" ") || "Someone";
        const uid =
          profile.user_id ?? profile.userId ?? l.liker_id ?? l.likerId;
        notifications.push({
          notificationId: `like-${l.like_id ?? l.likeId ?? uid}`,
          type: "like",
          title: "Someone liked you",
          message: `${name} liked your profile`,
          userId: uid,
          read: false,
          createdAt: l.created_at ?? l.createdAt ?? now,
        });
      });

      const convs = convRes?.data ?? [];
      convs.forEach((c: any) => {
        const unread = c.unread_count ?? c.unreadCount ?? 0;
        const other = c.other_user ?? c.participant ?? {};
        const name =
          [
            other.first_name ?? other.firstName,
            other.last_name ?? other.lastName,
          ]
            .filter(Boolean)
            .join(" ") || "Someone";
        const last = c.last_message ?? c.lastMessage;
        const preview = last?.content
          ? last.content.slice(0, 50) + (last.content.length > 50 ? "…" : "")
          : "New message";
        notifications.push({
          notificationId: `msg-${c.conversation_id ?? c.conversationId}`,
          type: "message",
          title: unread > 0 ? `New message from ${name}` : name,
          message: preview,
          userId: other.user_id ?? other.userId,
          conversationId: c.conversation_id ?? c.conversationId,
          participantName: name,
          read: unread === 0,
          createdAt:
            c.last_message_at ?? c.lastMessageAt ?? c.created_at ?? now,
        });
      });

      const events = userEventsRes?.events ?? [];
      events.slice(0, 10).forEach((ev: any) => {
        const e = ev.event ?? ev;
        const eventTime = new Date(
          e.date_time ?? e.startTime ?? e.dateTime ?? now,
        );
        const in24h =
          eventTime.getTime() - Date.now() < 24 * 60 * 60 * 1000 &&
          eventTime.getTime() > Date.now();
        if (!in24h) return;
        notifications.push({
          notificationId: `event-${e.event_id ?? e.eventId}`,
          type: "event",
          title: "Event reminder",
          message: `${e.title ?? "Event"} starts soon`,
          eventId: e.event_id ?? e.eventId,
          read: false,
          createdAt: e.date_time ?? e.startTime ?? now,
        });
      });

      notifications.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      return notifications;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch notifications");
    }
  },
);

export const markAsRead = createAsyncThunk(
  "notifications/markAsRead",
  async (notificationId: string, { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      // await apiClient.post(`/notifications/${notificationId}/read`);
      return notificationId;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Failed to mark notification as read",
      );
    }
  },
);

export const markAllAsRead = createAsyncThunk(
  "notifications/markAllAsRead",
  async (_, { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      // await apiClient.post('/notifications/read-all');
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to mark all as read");
    }
  },
);

export const deleteNotification = createAsyncThunk(
  "notifications/deleteNotification",
  async (notificationId: string, { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      // await apiClient.delete(`/notifications/${notificationId}`);
      return notificationId;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to delete notification");
    }
  },
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter((n) => !n.read).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(
          (n) => n.notificationId === action.payload,
        );
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach((n) => {
          n.read = true;
        });
        state.unreadCount = 0;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const notification = state.notifications.find(
          (n) => n.notificationId === action.payload,
        );
        if (notification && !notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications = state.notifications.filter(
          (n) => n.notificationId !== action.payload,
        );
      });
  },
});

export const { addNotification, clearError } = notificationsSlice.actions;
export default notificationsSlice.reducer;
