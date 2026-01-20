import prisma from '@/config/database';
import { logger } from '@/utils/logger';
import { Prisma, RSVPStatus } from '@prisma/client';
import {
  normalizePagination,
  createPaginatedResponse,
  getPaginationMetadata,
} from '@/utils/pagination';

export interface CreateEventInput {
  groupId?: string;
  title: string;
  description?: string;
  dateTime: Date;
  location: string;
  accessibilityNotes?: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  dateTime?: Date;
  location?: string;
  accessibilityNotes?: string;
}

export interface ListEventsParams {
  limit?: number;
  offset?: number;
  groupId?: string;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  upcomingOnly?: boolean;
}

export class EventService {
  /**
   * Create a new event
   */
  async createEvent(creatorId: string, data: CreateEventInput) {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { user_id: creatorId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // If groupId provided, verify group exists and user is a member
      if (data.groupId) {
        const group = await prisma.group.findUnique({
          where: { group_id: data.groupId },
        });

        if (!group) {
          throw new Error('Group not found');
        }

        const membership = await prisma.groupMember.findUnique({
          where: {
            group_id_user_id: {
              group_id: data.groupId,
              user_id: creatorId,
            },
          },
        });

        if (!membership) {
          throw new Error('You must be a member of the group to create events for it');
        }
      }

      // Create event
      const event = await prisma.event.create({
        data: {
          group_id: data.groupId || null,
          creator_id: creatorId,
          title: data.title,
          description: data.description,
          date_time: data.dateTime,
          location: data.location,
          accessibility_notes: data.accessibilityNotes,
          attendee_count: 1, // Creator is first attendee
        },
        include: {
          creator: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
          group: data.groupId
            ? {
                select: {
                  group_id: true,
                  name: true,
                },
              }
            : false,
        },
      });

      // Create RSVP for creator
      await prisma.eventRSVP.create({
        data: {
          event_id: event.event_id,
          user_id: creatorId,
          status: 'GOING',
        },
      });

      logger.info(`Event created: ${event.event_id} by user ${creatorId}`);

      return event;
    } catch (error) {
      logger.error('Error creating event', error);
      throw error;
    }
  }

  /**
   * Get event by ID
   */
  async getEvent(eventId: string, userId?: string) {
    try {
      const event = await prisma.event.findUnique({
        where: { event_id: eventId },
        include: {
          creator: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
          group: {
            select: {
              group_id: true,
              name: true,
              description: true,
            },
          },
        },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Check if user has RSVP'd
      let userRSVP: { status: RSVPStatus; created_at: Date } | null = null;

      if (userId) {
        const rsvp = await prisma.eventRSVP.findUnique({
          where: {
            event_id_user_id: {
              event_id: eventId,
              user_id: userId,
            },
          },
        });

        if (rsvp) {
          userRSVP = {
            status: rsvp.status,
            created_at: rsvp.created_at,
          };
        }
      }

      return {
        ...event,
        userRSVP,
      };
    } catch (error) {
      logger.error('Error getting event', error);
      throw error;
    }
  }

  /**
   * List events with filters
   */
  async listEvents(params: ListEventsParams) {
    try {
      const { limit, offset } = normalizePagination(params.limit, params.offset);
      const { groupId, location, startDate, endDate, upcomingOnly } = params;

      // Build where clause
      const where: Prisma.EventWhereInput = {};

      if (groupId) {
        where.group_id = groupId;
      }

      if (location) {
        where.location = {
          contains: location,
          mode: 'insensitive',
        };
      }

      if (startDate || endDate) {
        where.date_time = {};
        if (startDate) {
          where.date_time.gte = startDate;
        }
        if (endDate) {
          where.date_time.lte = endDate;
        }
      }

      if (upcomingOnly) {
        where.date_time = {
          ...where.date_time,
          gte: new Date(),
        };
      }

      // Get total count
      const total = await prisma.event.count({ where });

      // Get events
      const events = await prisma.event.findMany({
        where,
        orderBy: { date_time: 'asc' },
        take: limit,
        skip: offset,
        include: {
          creator: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
            },
          },
          group: {
            select: {
              group_id: true,
              name: true,
            },
          },
        },
      });

      const pagination = getPaginationMetadata(total, limit, offset);

      logger.info('Events listed', {
        total,
        returned: events.length,
        limit,
        offset,
      });

      return {
        ...createPaginatedResponse(events, total, limit, offset),
        pagination,
      };
    } catch (error) {
      logger.error('Error listing events', error);
      throw error;
    }
  }

  /**
   * Update event (creator/admin only)
   */
  async updateEvent(eventId: string, userId: string, data: UpdateEventInput) {
    try {
      // Get event
      const event = await prisma.event.findUnique({
        where: { event_id: eventId },
        include: {
          group: {
            include: {
              members: {
                where: { user_id: userId },
              },
            },
          },
        },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Check permissions: creator or group admin
      let canUpdate = event.creator_id === userId;

      if (!canUpdate && event.group_id && event.group) {
        const membership = event.group.members[0];
        if (membership && membership.role === 'ADMIN') {
          canUpdate = true;
        }
      }

      if (!canUpdate) {
        throw new Error('Only event creator or group admin can update the event');
      }

      // Build update data
      const updateData: Prisma.EventUpdateInput = {};

      if (data.title !== undefined) {
        updateData.title = data.title;
      }

      if (data.description !== undefined) {
        updateData.description = data.description;
      }

      if (data.dateTime !== undefined) {
        updateData.date_time = data.dateTime;
      }

      if (data.location !== undefined) {
        updateData.location = data.location;
      }

      if (data.accessibilityNotes !== undefined) {
        updateData.accessibility_notes = data.accessibilityNotes;
      }

      // Update event
      const updatedEvent = await prisma.event.update({
        where: { event_id: eventId },
        data: updateData,
        include: {
          creator: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
            },
          },
          group: {
            select: {
              group_id: true,
              name: true,
            },
          },
        },
      });

      logger.info(`Event ${eventId} updated by user ${userId}`);

      return updatedEvent;
    } catch (error) {
      logger.error('Error updating event', error);
      throw error;
    }
  }

  /**
   * Delete event (creator/admin only)
   */
  async deleteEvent(eventId: string, userId: string) {
    try {
      // Get event
      const event = await prisma.event.findUnique({
        where: { event_id: eventId },
        include: {
          group: {
            include: {
              members: {
                where: { user_id: userId },
              },
            },
          },
        },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Check permissions: creator or group admin
      let canDelete = event.creator_id === userId;

      if (!canDelete && event.group_id && event.group) {
        const membership = event.group.members[0];
        if (membership && membership.role === 'ADMIN') {
          canDelete = true;
        }
      }

      if (!canDelete) {
        throw new Error('Only event creator or group admin can delete the event');
      }

      // Delete event (cascade will handle RSVPs)
      await prisma.event.delete({
        where: { event_id: eventId },
      });

      logger.info(`Event ${eventId} deleted by user ${userId}`);

      return { message: 'Event deleted successfully' };
    } catch (error) {
      logger.error('Error deleting event', error);
      throw error;
    }
  }

  /**
   * RSVP to an event
   */
  async rsvpToEvent(eventId: string, userId: string, status: RSVPStatus) {
    try {
      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { event_id: eventId },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Check if already RSVP'd
      const existingRSVP = await prisma.eventRSVP.findUnique({
        where: {
          event_id_user_id: {
            event_id: eventId,
            user_id: userId,
          },
        },
      });

      let rsvp;
      let attendeeCountChange = 0;

      if (existingRSVP) {
        // Update existing RSVP
        const oldStatus = existingRSVP.status;
        const newStatus = status;

        rsvp = await prisma.eventRSVP.update({
          where: {
            event_id_user_id: {
              event_id: eventId,
              user_id: userId,
            },
          },
          data: { status },
        });

        // Update attendee count based on status change
        if (oldStatus === 'GOING' && newStatus !== 'GOING') {
          attendeeCountChange = -1;
        } else if (oldStatus !== 'GOING' && newStatus === 'GOING') {
          attendeeCountChange = 1;
        }
      } else {
        // Create new RSVP
        rsvp = await prisma.eventRSVP.create({
          data: {
            event_id: eventId,
            user_id: userId,
            status,
          },
        });

        // Update attendee count if going
        if (status === 'GOING') {
          attendeeCountChange = 1;
        }
      }

      // Update event attendee count
      if (attendeeCountChange !== 0) {
        await prisma.event.update({
          where: { event_id: eventId },
          data: {
            attendee_count: {
              increment: attendeeCountChange,
            },
          },
        });
      }

      logger.info(`User ${userId} RSVP'd ${status} to event ${eventId}`);

      return rsvp;
    } catch (error) {
      logger.error('Error RSVPing to event', error);
      throw error;
    }
  }

  /**
   * Get event RSVPs
   */
  async getEventRSVPs(eventId: string, limit: number = 50, offset: number = 0) {
    try {
      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { event_id: eventId },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Get total count
      const total = await prisma.eventRSVP.count({
        where: { event_id: eventId },
      });

      // Get RSVPs
      const rsvps = await prisma.eventRSVP.findMany({
        where: { event_id: eventId },
        orderBy: [
          { status: 'asc' }, // GOING first, then MAYBE, then NOT_GOING
          { created_at: 'asc' },
        ],
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              verified: true,
              profile: {
                select: {
                  profile_id: true,
                  bio: true,
                  interests: true,
                },
              },
            },
          },
        },
      });

      const pagination = getPaginationMetadata(total, limit, offset);

      return {
        rsvps: rsvps.map((r) => ({
          rsvp_id: r.rsvp_id,
          status: r.status,
          created_at: r.created_at,
          user: r.user,
        })),
        pagination,
      };
    } catch (error) {
      logger.error('Error getting event RSVPs', error);
      throw error;
    }
  }

  /**
   * Get user's events
   */
  async getUserEvents(userId: string, upcomingOnly: boolean = false) {
    try {
      const where: Prisma.EventRSVPWhereInput = {
        user_id: userId,
        status: 'GOING', // Only events user is going to
      };

      if (upcomingOnly) {
        where.event = {
          date_time: {
            gte: new Date(),
          },
        };
      }

      const rsvps = await prisma.eventRSVP.findMany({
        where,
        include: {
          event: {
            include: {
              creator: {
                select: {
                  user_id: true,
                  first_name: true,
                  last_name: true,
                },
              },
              group: {
                select: {
                  group_id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          event: {
            date_time: 'asc',
          },
        },
      });

      return rsvps.map((r) => ({
        rsvp_id: r.rsvp_id,
        status: r.status,
        created_at: r.created_at,
        event: r.event,
      }));
    } catch (error) {
      logger.error('Error getting user events', error);
      throw error;
    }
  }

  /**
   * Get group events
   */
  async getGroupEvents(groupId: string, upcomingOnly: boolean = false) {
    try {
      // Check if group exists
      const group = await prisma.group.findUnique({
        where: { group_id: groupId },
      });

      if (!group) {
        throw new Error('Group not found');
      }

      const where: Prisma.EventWhereInput = {
        group_id: groupId,
      };

      if (upcomingOnly) {
        where.date_time = {
          gte: new Date(),
        };
      }

      const events = await prisma.event.findMany({
        where,
        orderBy: { date_time: 'asc' },
        include: {
          creator: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      return events;
    } catch (error) {
      logger.error('Error getting group events', error);
      throw error;
    }
  }
}

// Export singleton instance
const eventService = new EventService();
export default eventService;

