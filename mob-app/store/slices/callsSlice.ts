import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface VoiceCall {
  callId: string;
  callerId: string;
  receiverId: string;
  status: 'INITIATED' | 'RINGING' | 'ANSWERED' | 'REJECTED' | 'MISSED' | 'ENDED' | 'CANCELLED';
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  twilioRoomSid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CallsState {
  activeCall: VoiceCall | null;
  incomingCall: VoiceCall | null;
  callHistory: VoiceCall[];
  isWebRTCConnected: boolean;
  webRTCConfig: {
    stunServers?: string[];
    turnServer?: string;
    turnUsername?: string;
    turnCredential?: string;
  } | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CallsState = {
  activeCall: null,
  incomingCall: null,
  callHistory: [],
  isWebRTCConnected: false,
  webRTCConfig: null,
  isLoading: false,
  error: null,
};

const callsSlice = createSlice({
  name: 'calls',
  initialState,
  reducers: {
    setActiveCall: (state, action: PayloadAction<VoiceCall | null>) => {
      state.activeCall = action.payload;
    },
    setIncomingCall: (state, action: PayloadAction<VoiceCall | null>) => {
      state.incomingCall = action.payload;
    },
    addCallToHistory: (state, action: PayloadAction<VoiceCall>) => {
      state.callHistory.unshift(action.payload);
    },
    updateCallHistory: (state, action: PayloadAction<VoiceCall[]>) => {
      state.callHistory = action.payload;
    },
    setWebRTCConnected: (state, action: PayloadAction<boolean>) => {
      state.isWebRTCConnected = action.payload;
    },
    setWebRTCConfig: (state, action: PayloadAction<CallsState['webRTCConfig']>) => {
      state.webRTCConfig = action.payload;
    },
    updateCallStatus: (state, action: PayloadAction<{ callId: string; status: VoiceCall['status'] }>) => {
      const { callId, status } = action.payload;

      if (state.activeCall?.callId === callId) {
        state.activeCall.status = status;
      }
      if (state.incomingCall?.callId === callId) {
        state.incomingCall.status = status;
      }

      // Update in history
      const callIndex = state.callHistory.findIndex(call => call.callId === callId);
      if (callIndex >= 0) {
        state.callHistory[callIndex].status = status;
      }
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
  setActiveCall,
  setIncomingCall,
  addCallToHistory,
  updateCallHistory,
  setWebRTCConnected,
  setWebRTCConfig,
  updateCallStatus,
  setError,
  setLoading,
} = callsSlice.actions;
export default callsSlice.reducer;
