import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  eventsService,
  Event,
  EventRSVP,
  CreateEventData,
  UpdateEventData,
  ListEventsParams,
  GetEventRSVPsParams,
  RSVPData,
} from '../../services/api/eventsService';

export interface EventsState {
  events: Event[];
  userEvents: Event[];
  eventRSVPs: Record<string, EventRSVP[]>; // eventId -> rsvps
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
}

const initialState: EventsState = {
  events: [],
  userEvents: [],
  eventRSVPs: {},
  isLoading: false,
  error: null,
  pagination: null,
};

// Async thunks
export const createEvent = createAsyncThunk(
  'events/createEvent',
  async (data: CreateEventData, { rejectWithValue }) => {
    try {
      const event = await eventsService.createEvent(data);
      return event;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create event');
    }
  }
);

export const listEvents = createAsyncThunk(
  'events/listEvents',
  async (params: ListEventsParams = {}, { rejectWithValue }) => {
    try {
      const response = await eventsService.listEvents(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch events');
    }
  }
);

export const getEvent = createAsyncThunk(
  'events/getEvent',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const event = await eventsService.getEvent(eventId);
      return event;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch event');
    }
  }
);

export const updateEvent = createAsyncThunk(
  'events/updateEvent',
  async ({ eventId, data }: { eventId: string; data: UpdateEventData }, { rejectWithValue }) => {
    try {
      const event = await eventsService.updateEvent(eventId, data);
      return event;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update event');
    }
  }
);

export const deleteEvent = createAsyncThunk(
  'events/deleteEvent',
  async (eventId: string, { rejectWithValue }) => {
    try {
      await eventsService.deleteEvent(eventId);
      return eventId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to delete event');
    }
  }
);

export const rsvpToEvent = createAsyncThunk(
  'events/rsvpToEvent',
  async ({ eventId, data }: { eventId: string; data: RSVPData }, { rejectWithValue }) => {
    try {
      const rsvp = await eventsService.rsvpToEvent(eventId, data);
      return { eventId, rsvp };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to RSVP to event');
    }
  }
);

export const getEventRSVPs = createAsyncThunk(
  'events/getEventRSVPs',
  async (params: GetEventRSVPsParams, { rejectWithValue }) => {
    try {
      const response = await eventsService.getEventRSVPs(params);
      return { eventId: params.eventId, ...response };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch RSVPs');
    }
  }
);

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setEvents: (state, action: PayloadAction<Event[]>) => {
      state.events = action.payload;
    },
    setUserEvents: (state, action: PayloadAction<Event[]>) => {
      state.userEvents = action.payload;
    },
    addEvent: (state, action: PayloadAction<Event>) => {
      state.events.unshift(action.payload);
    },
    setEventRSVPs: (state, action: PayloadAction<{ eventId: string; rsvps: EventRSVP[] }>) => {
      state.eventRSVPs[action.payload.eventId] = action.payload.rsvps;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // createEvent
      .addCase(createEvent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.events.unshift(action.payload);
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // listEvents
      .addCase(listEvents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(listEvents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.events = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(listEvents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // getEvent
      .addCase(getEvent.fulfilled, (state, action) => {
        const index = state.events.findIndex(e => e.eventId === action.payload.eventId);
        if (index >= 0) {
          state.events[index] = action.payload;
        } else {
          state.events.unshift(action.payload);
        }
      })
      // updateEvent
      .addCase(updateEvent.fulfilled, (state, action) => {
        const index = state.events.findIndex(e => e.eventId === action.payload.eventId);
        if (index >= 0) {
          state.events[index] = action.payload;
        }
      })
      // deleteEvent
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.events = state.events.filter(e => e.eventId !== action.payload);
        state.userEvents = state.userEvents.filter(e => e.eventId !== action.payload);
        delete state.eventRSVPs[action.payload];
      })
      // rsvpToEvent
      .addCase(rsvpToEvent.fulfilled, (state, action) => {
        const rsvps = state.eventRSVPs[action.payload.eventId] || [];
        const existingIndex = rsvps.findIndex(r => r.userId === action.payload.rsvp.userId);
        if (existingIndex >= 0) {
          rsvps[existingIndex] = action.payload.rsvp;
        } else {
          rsvps.push(action.payload.rsvp);
        }
        state.eventRSVPs[action.payload.eventId] = rsvps;
        // Update attendee count
        const event = state.events.find(e => e.eventId === action.payload.eventId);
        if (event) {
          if (action.payload.rsvp.status === 'going') {
            event.attendeeCount += 1;
          } else if (action.payload.rsvp.status === 'not_going' && existingIndex >= 0) {
            const oldRsvp = rsvps[existingIndex];
            if (oldRsvp.status === 'going') {
              event.attendeeCount = Math.max(0, event.attendeeCount - 1);
            }
          }
        }
      })
      // getEventRSVPs
      .addCase(getEventRSVPs.fulfilled, (state, action) => {
        state.eventRSVPs[action.payload.eventId] = action.payload.data;
      });
  },
});

export const {
  setEvents,
  setUserEvents,
  addEvent,
  setEventRSVPs,
  setError,
  setLoading,
} = eventsSlice.actions;
export default eventsSlice.reducer;
