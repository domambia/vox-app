import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slices
import authReducer from './slices/authSlice';
import profileReducer from './slices/profileSlice';
import messagesReducer from './slices/messagesSlice';
import groupsReducer from './slices/groupsSlice';
import eventsReducer from './slices/eventsSlice';
import callsReducer from './slices/callsSlice';
import discoveryReducer from './slices/discoverySlice';
import settingsReducer from './slices/settingsSlice';
import notificationsReducer from './slices/notificationsSlice';
import toastReducer from './slices/toastSlice';

// Temporarily disable persistence completely
const rootReducer = combineReducers({
  auth: authReducer,
  profile: profileReducer,
  messages: messagesReducer,
  groups: groupsReducer,
  events: eventsReducer,
  calls: callsReducer,
  discovery: discoveryReducer,
  settings: settingsReducer,
  notifications: notificationsReducer,
  toast: toastReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

// Mock persistor that resolves immediately
export const persistor = {
  getState: () => ({ bootstrapped: true }),
  subscribe: () => () => {},
  dispatch: () => {},
};

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
