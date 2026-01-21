import { createSlice } from '@reduxjs/toolkit';
import { Event, EventRSVP } from '../../types/models.types';

interface EventsState {
  events: Event[];
  eventDetails: Record<string, Event>; // eventId -> event details
  eventRSVPs: Record<string, EventRSVP[]>; // eventId -> RSVPs
  userRSVPs: Record<string, 'going' | 'maybe' | 'not_going'>; // eventId -> user's RSVP status
  isLoading: boolean;
  error: string | null;
}

const initialState: EventsState = {
  events: [],
  eventDetails: {},
  eventRSVPs: {},
  userRSVPs: {},
  isLoading: false,
  error: null,
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setEvents: (state, action) => {
      state.events = action.payload;
    },
    addEvent: (state, action) => {
      const existingIndex = state.events.findIndex((e) => e.eventId === action.payload.eventId);
      if (existingIndex >= 0) {
        state.events[existingIndex] = action.payload;
      } else {
        state.events.push(action.payload);
      }
    },
    setEventDetails: (state, action: { payload: { eventId: string; event: Event } }) => {
      state.eventDetails[action.payload.eventId] = action.payload.event;
    },
    setEventRSVPs: (state, action: { payload: { eventId: string; rsvps: EventRSVP[] } }) => {
      state.eventRSVPs[action.payload.eventId] = action.payload.rsvps;
    },
    setUserRSVP: (state, action: { payload: { eventId: string; status: 'going' | 'maybe' | 'not_going' } }) => {
      state.userRSVPs[action.payload.eventId] = action.payload.status;
    },
    updateEvent: (state, action) => {
      const event = action.payload;
      const index = state.events.findIndex((e) => e.eventId === event.eventId);
      if (index >= 0) {
        state.events[index] = event;
      }
      if (state.eventDetails[event.eventId]) {
        state.eventDetails[event.eventId] = event;
      }
    },
    removeEvent: (state, action: { payload: string }) => {
      state.events = state.events.filter((e) => e.eventId !== action.payload);
      delete state.eventDetails[action.payload];
      delete state.eventRSVPs[action.payload];
      delete state.userRSVPs[action.payload];
    },
    clearEvents: (state) => {
      state.events = [];
      state.eventDetails = {};
      state.eventRSVPs = {};
      state.userRSVPs = {};
    },
  },
});

export const {
  setEvents,
  addEvent,
  setEventDetails,
  setEventRSVPs,
  setUserRSVP,
  updateEvent,
  removeEvent,
  clearEvents,
} = eventsSlice.actions;
export default eventsSlice.reducer;

