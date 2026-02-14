import { z } from "zod";

const eventIdSchema = z
  .string()
  .uuid("Invalid event ID format")
  .or(z.string().regex(/^seed-[a-z0-9-]+$/i, "Invalid event ID format"));

const groupIdSchema = z
  .string()
  .uuid("Invalid group ID format")
  .or(z.string().regex(/^seed-[a-z0-9-]+$/i, "Invalid group ID format"));

// Create event schema
export const createEventSchema = z.object({
  body: z.object({
    groupId: groupIdSchema.optional(),
    title: z
      .string()
      .min(1, "Title is required")
      .max(255, "Title must be less than 255 characters"),
    description: z
      .string()
      .max(2000, "Description must be less than 2000 characters")
      .optional()
      .or(z.literal("")),
    dateTime: z
      .string()
      .datetime(
        "Invalid date format. Use ISO 8601 format (e.g., 2025-01-25T14:00:00Z)",
      )
      .transform((val) => new Date(val)),
    location: z
      .string()
      .min(1, "Location is required")
      .max(500, "Location must be less than 500 characters"),
    accessibilityNotes: z
      .string()
      .max(1000, "Accessibility notes must be less than 1000 characters")
      .optional()
      .or(z.literal("")),
  }),
});

// Update event schema
export const updateEventSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(255, "Title must be less than 255 characters")
      .optional(),
    description: z
      .string()
      .max(2000, "Description must be less than 2000 characters")
      .optional()
      .or(z.literal("")),
    dateTime: z
      .string()
      .datetime("Invalid date format. Use ISO 8601 format")
      .transform((val) => new Date(val))
      .optional(),
    location: z
      .string()
      .min(1, "Location is required")
      .max(500, "Location must be less than 500 characters")
      .optional(),
    accessibilityNotes: z
      .string()
      .max(1000, "Accessibility notes must be less than 1000 characters")
      .optional()
      .or(z.literal("")),
  }),
});

// Get event schema (params)
export const getEventSchema = z.object({
  params: z.object({
    eventId: eventIdSchema,
  }),
});

// List events schema
export const listEventsSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    groupId: groupIdSchema.optional(),
    location: z.string().max(500).optional(),
    startDate: z
      .string()
      .datetime()
      .transform((val) => new Date(val))
      .optional(),
    endDate: z
      .string()
      .datetime()
      .transform((val) => new Date(val))
      .optional(),
    upcomingOnly: z
      .string()
      .optional()
      .transform((val) => val === "true"),
  }),
});

// RSVP schema
export const rsvpSchema = z.object({
  params: z.object({
    eventId: eventIdSchema,
  }),
  body: z.object({
    status: z.enum(["GOING", "MAYBE", "NOT_GOING"], {
      errorMap: () => ({
        message: "Status must be GOING, MAYBE, or NOT_GOING",
      }),
    }),
  }),
});

// Get event RSVPs schema
export const getEventRSVPsSchema = z.object({
  params: z.object({
    eventId: eventIdSchema,
  }),
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
  }),
});

// Get user events schema
export const getUserEventsSchema = z.object({
  params: z.object({
    userId: z.string().uuid("Invalid user ID format"),
  }),
  query: z.object({
    upcomingOnly: z
      .string()
      .optional()
      .transform((val) => val === "true"),
  }),
});

// Get group events schema
export const getGroupEventsSchema = z.object({
  params: z.object({
    groupId: groupIdSchema,
  }),
  query: z.object({
    upcomingOnly: z
      .string()
      .optional()
      .transform((val) => val === "true"),
  }),
});
