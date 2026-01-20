import { Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import eventService from '@/services/event.service';
import { AuthRequest } from '@/types';
import { extractPaginationFromQuery } from '@/utils/pagination';

export class EventController {
  /**
   * Create a new event
   * POST /api/v1/events
   */
  async createEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const creatorId = req.user!.userId;
      const data = req.body;

      const event = await eventService.createEvent(creatorId, data);
      sendSuccess(res, event, 201);
    } catch (error: any) {
      if (error.message === 'User not found') {
        sendError(res, 'USER_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message === 'Group not found') {
        sendError(res, 'GROUP_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message.includes('must be a member of the group')) {
        sendError(res, 'FORBIDDEN', error.message, 403);
        return;
      }
      sendError(res, 'EVENT_CREATION_ERROR', error.message || 'Failed to create event', 400);
    }
  }

  /**
   * Get event by ID
   * GET /api/v1/events/:eventId
   */
  async getEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = req.user?.userId;

      const event = await eventService.getEvent(eventId, userId);
      sendSuccess(res, event);
    } catch (error: any) {
      if (error.message === 'Event not found') {
        sendError(res, 'EVENT_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'EVENT_FETCH_ERROR', error.message || 'Failed to fetch event', 400);
    }
  }

  /**
   * List events
   * GET /api/v1/events
   */
  async listEvents(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { limit, offset } = extractPaginationFromQuery(req.query);
      const { groupId, location, startDate, endDate, upcomingOnly } = req.query;

      const result = await eventService.listEvents({
        limit,
        offset,
        groupId: groupId as string | undefined,
        location: location as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        upcomingOnly: upcomingOnly === 'true',
      });

      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, 'EVENTS_LIST_ERROR', error.message || 'Failed to list events', 400);
    }
  }

  /**
   * Update event
   * PUT /api/v1/events/:eventId
   */
  async updateEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = req.user!.userId;
      const data = req.body;

      const event = await eventService.updateEvent(eventId, userId, data);
      sendSuccess(res, event);
    } catch (error: any) {
      if (error.message === 'Event not found') {
        sendError(res, 'EVENT_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message.includes('Only event creator or group admin')) {
        sendError(res, 'FORBIDDEN', error.message, 403);
        return;
      }
      sendError(res, 'EVENT_UPDATE_ERROR', error.message || 'Failed to update event', 400);
    }
  }

  /**
   * Delete event
   * DELETE /api/v1/events/:eventId
   */
  async deleteEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = req.user!.userId;

      const result = await eventService.deleteEvent(eventId, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Event not found') {
        sendError(res, 'EVENT_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message.includes('Only event creator or group admin')) {
        sendError(res, 'FORBIDDEN', error.message, 403);
        return;
      }
      sendError(res, 'EVENT_DELETE_ERROR', error.message || 'Failed to delete event', 400);
    }
  }

  /**
   * RSVP to an event
   * POST /api/v1/events/:eventId/rsvp
   */
  async rsvpToEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = req.user!.userId;
      const { status } = req.body;

      const rsvp = await eventService.rsvpToEvent(eventId, userId, status);
      sendSuccess(res, rsvp);
    } catch (error: any) {
      if (error.message === 'Event not found') {
        sendError(res, 'EVENT_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'RSVP_ERROR', error.message || 'Failed to RSVP to event', 400);
    }
  }

  /**
   * Get event RSVPs
   * GET /api/v1/events/:eventId/rsvps
   */
  async getEventRSVPs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const { limit, offset } = extractPaginationFromQuery(req.query);

      const result = await eventService.getEventRSVPs(eventId, limit, offset);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Event not found') {
        sendError(res, 'EVENT_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'RSVPS_FETCH_ERROR', error.message || 'Failed to fetch RSVPs', 400);
    }
  }

  /**
   * Get user's events
   * GET /api/v1/users/:userId/events
   */
  async getUserEvents(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const upcomingOnly = req.query.upcomingOnly === 'true';

      // Users can only see their own events unless admin
      if (userId !== req.user!.userId) {
        sendError(res, 'FORBIDDEN', 'You can only view your own events', 403);
        return;
      }

      const events = await eventService.getUserEvents(userId, upcomingOnly);
      sendSuccess(res, { events });
    } catch (error: any) {
      sendError(res, 'USER_EVENTS_ERROR', error.message || 'Failed to get user events', 400);
    }
  }

  /**
   * Get group events
   * GET /api/v1/groups/:groupId/events
   */
  async getGroupEvents(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const upcomingOnly = req.query.upcomingOnly === 'true';

      const events = await eventService.getGroupEvents(groupId, upcomingOnly);
      sendSuccess(res, { events });
    } catch (error: any) {
      if (error.message === 'Group not found') {
        sendError(res, 'GROUP_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'GROUP_EVENTS_ERROR', error.message || 'Failed to get group events', 400);
    }
  }
}

// Export singleton instance
const eventController = new EventController();
export default eventController;

