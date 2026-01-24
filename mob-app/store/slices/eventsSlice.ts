import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Event {
  eventId: string;
  groupId?: string;
  creatorId: string;
  title: string;
  description?: string;
  dateTime: string;
  location: string;
  accessibilityNotes?: string;
  attendeeCount: number;
  createdAt: string;
}

export interface EventRSVP {
  rsvpId: string;
  eventId: string;
  userId: string;
  status: 'going' | 'maybe' | 'not_going';
  createdAt: string;
}

export interface EventsState {
  events: Event[];
  userEvents: Event[];
  eventRSVPs: Record<string, EventRSVP[]>; // eventId -> rsvps
  isLoading: boolean;
  error: string | null;
}

const initialState: EventsState = {
  events: [],
  userEvents: [],
  eventRSVPs: {},
  isLoading: false,
  error: null,
};

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
