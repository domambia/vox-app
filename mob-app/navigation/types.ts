import type { MainTabParamList } from './MainNavigator';

export type RootStackParamList = {
  Main: { initialTab?: keyof MainTabParamList } | undefined;
  Auth: undefined;
};

