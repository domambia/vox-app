import type { MainTabParamList } from './MainNavigator';

export type RootStackParamList = {
  Main: { initialTab?: keyof MainTabParamList } | undefined;
  Auth: undefined;
  Call: {
    callId?: string;
    receiverId: string;
    receiverName: string;
    direction?: 'outgoing' | 'incoming';
  };
};

