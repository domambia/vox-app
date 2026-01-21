import type { NavigatorScreenParams } from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  RegisterStepOne: undefined;
  RegisterStepTwo: {
    phoneNumber: string;
    password: string;
    countryCode: string;
  };
  RegisterStepThree: {
    phoneNumber: string;
    password: string;
    countryCode: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  ForgotPassword: undefined;
  VerifyResetToken: {
    phoneNumber: string;
  };
  CompletePasswordReset: {
    phoneNumber: string;
    token: string;
  };
  Help: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  Discover: undefined;
  Messages: undefined;
  Groups: undefined;
  Events: undefined;
  Profile: undefined;
};

// Discover Stack
export type DiscoverStackParamList = {
  DiscoverFeed: undefined;
  ProfileDetail: {
    userId: string;
  };
  Matches: undefined;
  MatchDetail: {
    matchId: string;
  };
  Likes: {
    type?: 'given' | 'received';
  };
};

// Messages Stack
export type MessagesStackParamList = {
  Conversations: undefined;
  Chat: {
    conversationId: string;
    recipientId?: string;
  };
};

// Groups Stack
export type GroupsStackParamList = {
  GroupsList: undefined;
  GroupDetail: {
    groupId: string;
  };
  GroupMembers: {
    groupId: string;
  };
  CreateGroup: undefined;
  EditGroup: {
    groupId: string;
  };
};

// Events Stack
export type EventsStackParamList = {
  EventsList: undefined;
  EventDetail: {
    eventId: string;
  };
  CreateEvent: {
    groupId?: string;
  };
  EditEvent: {
    eventId: string;
  };
  EventRSVPs: {
    eventId: string;
  };
};

// Profile Stack
export type ProfileStackParamList = {
  ProfileView: {
    userId?: string;
  };
  ProfileEdit: undefined;
  VoiceBioRecord: undefined;
  Settings: undefined;
  AccountSettings: undefined;
  PrivacySettings: undefined;
  NotificationSettings: undefined;
  AccessibilitySettings: undefined;
  About: undefined;
};

// KYC Stack
export type KYCStackParamList = {
  KYCSelection: undefined;
  DocumentUpload: {
    verificationId: string;
  };
  ScheduleCall: {
    verificationId: string;
  };
  VerificationStatus: {
    verificationId: string;
  };
  VerificationHistory: undefined;
};

// Root Navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  KYC: NavigatorScreenParams<KYCStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  IncomingCall: {
    callId: string;
    callerId: string;
  };
  ActiveCall: {
    callId: string;
  };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

