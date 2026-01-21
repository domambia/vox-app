import { createSlice } from '@reduxjs/toolkit';
import { VoiceCall, CallStatus } from '../../types/models.types';

interface CallsState {
  activeCall: VoiceCall | null;
  incomingCall: VoiceCall | null;
  callHistory: VoiceCall[];
  isLoading: boolean;
  error: string | null;
  webrtcConfig: {
    stunServers: Array<{ urls: string }>;
    turnServer?: string;
    turnUsername?: string;
    turnCredential?: string;
  } | null;
}

const initialState: CallsState = {
  activeCall: null,
  incomingCall: null,
  callHistory: [],
  isLoading: false,
  error: null,
  webrtcConfig: null,
};

const callsSlice = createSlice({
  name: 'calls',
  initialState,
  reducers: {
    setActiveCall: (state, action) => {
      state.activeCall = action.payload;
    },
    setIncomingCall: (state, action) => {
      state.incomingCall = action.payload;
    },
    clearActiveCall: (state) => {
      state.activeCall = null;
    },
    clearIncomingCall: (state) => {
      state.incomingCall = null;
    },
    updateCallStatus: (state, action: { payload: { callId: string; status: CallStatus } }) => {
      const { callId, status } = action.payload;
      if (state.activeCall?.callId === callId) {
        state.activeCall.status = status;
      }
      if (state.incomingCall?.callId === callId) {
        state.incomingCall.status = status;
      }
      const callIndex = state.callHistory.findIndex((c) => c.callId === callId);
      if (callIndex >= 0) {
        state.callHistory[callIndex].status = status;
      }
    },
    addCallToHistory: (state, action) => {
      const existingIndex = state.callHistory.findIndex((c) => c.callId === action.payload.callId);
      if (existingIndex >= 0) {
        state.callHistory[existingIndex] = action.payload;
      } else {
        state.callHistory.unshift(action.payload);
      }
    },
    setCallHistory: (state, action) => {
      state.callHistory = action.payload;
    },
    setWebRTCConfig: (state, action) => {
      state.webrtcConfig = action.payload;
    },
    clearCalls: (state) => {
      state.activeCall = null;
      state.incomingCall = null;
      state.callHistory = [];
      state.webrtcConfig = null;
    },
  },
});

export const {
  setActiveCall,
  setIncomingCall,
  clearActiveCall,
  clearIncomingCall,
  updateCallStatus,
  addCallToHistory,
  setCallHistory,
  setWebRTCConfig,
  clearCalls,
} = callsSlice.actions;
export default callsSlice.reducer;

