import { apiClient } from './apiClient';
import { AxiosResponse } from 'axios';

export interface Event {
  eventId: string;
  groupId?: string;
  creatorId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  maxAttendees?: number;
  attendeeCount: number;
  createdAt: string;
  updatedAt: string;
  creator?: {
    userId: string;
    firstName: string;
    lastName: string;
  };
  group?: {
    groupId: string;
    name: string;
  };
}

export interface EventRSVP {
  rsvpId: string;
  eventId: string;
  userId: string;
  status: 'going' | 'maybe' | 'not_going';
  createdAt: string;
  updatedAt: string;
  user?: {
    userId: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateEventData {
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  groupId?: string;
  maxAttendees?: number;
  accessibilityNotes?: string;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  maxAttendees?: number;
}

export interface ListEventsParams {
  page?: number;
  limit?: number;
  status?: 'upcoming' | 'ongoing' | 'past';
  upcomingOnly?: boolean;
  groupId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface GetEventRSVPsParams {
  eventId: string;
  page?: number;
  limit?: number;
  status?: 'going' | 'maybe' | 'not_going';
}

export interface RSVPData {
  status: 'going' | 'maybe' | 'not_going';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Normalize backend event (snake_case) to Event (camelCase, startTime) */
function mapBackendEvent(raw: any): Event {
  const e = raw?.event ?? raw;
  return {
    eventId: e.event_id ?? e.eventId ?? e.id ?? '',
    groupId: e.group_id ?? e.groupId,
    creatorId: e.creator_id ?? e.creatorId ?? '',
    title: e.title ?? '',
    description: e.description ?? undefined,
    startTime: e.date_time ?? e.startTime ?? e.start_time ?? e.dateTime ?? '',
    endTime: e.end_time ?? e.endTime,
    location: e.location ?? undefined,
    maxAttendees: e.max_attendees ?? e.maxAttendees,
    attendeeCount: e.attendee_count ?? e.attendeeCount ?? 0,
    createdAt: e.created_at ?? e.createdAt ?? '',
    updatedAt: e.updated_at ?? e.updatedAt ?? '',
    creator: e.creator ? {
      userId: e.creator.user_id ?? e.creator.userId,
      firstName: e.creator.first_name ?? e.creator.firstName,
      lastName: e.creator.last_name ?? e.creator.lastName,
    } : undefined,
    group: e.group ? { groupId: e.group.group_id ?? e.group.groupId, name: e.group.name } : undefined,
  };
}

class EventsService {
  /**
   * Create a new event. Backend expects dateTime (ISO), location (required), title, description?, groupId?, accessibilityNotes?.
   */
  async createEvent(data: CreateEventData): Promise<Event> {
    const body = {
      title: data.title,
      description: data.description ?? '',
      dateTime: data.startTime,
      location: (data.location && data.location.trim()) ? data.location.trim() : 'TBD',
      groupId: data.groupId,
      accessibilityNotes: data.accessibilityNotes ?? undefined,
    };
    const response: AxiosResponse = await apiClient.post('/events', body);
    return mapBackendEvent(response.data?.data ?? response.data);
  }

  /**
   * List events with filters
   */
  async listEvents(params?: ListEventsParams): Promise<PaginatedResponse<Event>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.upcomingOnly !== undefined) queryParams.append('upcomingOnly', params.upcomingOnly.toString());
    if (params?.groupId) queryParams.append('group_id', params.groupId);
    if (params?.dateFrom) queryParams.append('date_from', params.dateFrom);
    if (params?.dateTo) queryParams.append('date_to', params.dateTo);

    const url = `/events${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response: AxiosResponse = await apiClient.get(url);
    const data = response.data?.data ?? response.data;
    const items = data?.items ?? data?.events ?? data?.data ?? [];
    const pagination = data?.pagination ?? { page: 1, limit: 20, total: items.length, totalPages: 1 };
    return { data: items, pagination };
  }

  /**
   * Get event by ID. Maps backend date_time → startTime and snake_case → camelCase.
   */
  async getEvent(eventId: string): Promise<Event> {
    const response: AxiosResponse = await apiClient.get(`/events/${eventId}`);
    return mapBackendEvent(response.data?.data ?? response.data);
  }

  /**
   * Update event (creator/admin only)
   */
  async updateEvent(eventId: string, data: UpdateEventData): Promise<Event> {
    const response: AxiosResponse = await apiClient.put(`/events/${eventId}`, data);
    return response.data.data;
  }

  /**
   * Delete event (creator/admin only)
   */
  async deleteEvent(eventId: string): Promise<void> {
    await apiClient.delete(`/events/${eventId}`);
  }

  /**
   * RSVP to an event. Backend expects status: 'GOING' | 'MAYBE' | 'NOT_GOING' (uppercase).
   */
  async rsvpToEvent(eventId: string, data: RSVPData): Promise<EventRSVP> {
    const status = (data.status || 'going').toUpperCase() as 'GOING' | 'MAYBE' | 'NOT_GOING';
    const response: AxiosResponse = await apiClient.post(`/events/${eventId}/rsvp`, { status });
    return response.data.data;
  }

  /**
   * Get event RSVPs
   */
  async getEventRSVPs(params: GetEventRSVPsParams): Promise<PaginatedResponse<EventRSVP>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);

    const url = `/events/${params.eventId}/rsvps${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response: AxiosResponse = await apiClient.get(url);
    return response.data.data;
  }

  /**
   * Get events the user created or RSVP'd to
   * GET /api/v1/users/:userId/events
   */
  async getUserEvents(userId: string, params?: { upcomingOnly?: boolean }): Promise<{ events: Event[] }> {
    const queryParams = new URLSearchParams();
    if (params?.upcomingOnly !== undefined) queryParams.append('upcomingOnly', params.upcomingOnly.toString());

    const url = `/users/${userId}/events${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response: AxiosResponse = await apiClient.get(url);
    const data = response.data?.data ?? response.data;
    return {
      events: Array.isArray(data.events) ? data.events : [],
    };
  }
}

export const eventsService = new EventsService();
