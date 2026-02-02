import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { View, Text } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from './hooks/use-color-scheme';
import { AppColors } from './constants/theme';
import { store } from './store';
import { AuthNavigator } from './navigation/AuthNavigator';
import { MainNavigator } from './navigation/MainNavigator';
import { CallScreen } from './screens/voice/CallScreen';
import { useAppSelector } from './hooks/useAppSelector';
import { useAppDispatch } from './hooks/useAppDispatch';
import { initializeAuth } from './store/slices/authSlice';
import { loadSettings } from './store/slices/settingsSlice';
import { announceToScreenReader } from './services/accessibility/accessibilityUtils';
import { offlineService } from './services/network/offlineService';
import { VoiceCommandOverlay } from './components/accessible/VoiceCommandOverlay';
import { Toast } from './components/Toast';
import type { RootStackParamList } from './navigation/types';

// App Navigator Component (inside Redux Provider)
const RootStack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator({ navigationRef }: { navigationRef: ReturnType<typeof useNavigationContainerRef<RootStackParamList>> }) {
  const { isAuthenticated, isLoading, postLogin } = useAppSelector((state: any) => state.auth);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(initializeAuth());
    dispatch(loadSettings());
    offlineService.initialize();
  }, [dispatch]);

  useEffect(() => {
    announceToScreenReader('VOX app launched. A community for blind and visually impaired people.');
  }, []);

  useEffect(() => {
    if (!navigationRef.isReady()) return;
    if (isAuthenticated) {
      navigationRef.navigate('Main', { initialTab: postLogin ? 'Profile' : 'Messages' });
    } else {
      navigationRef.navigate('Auth');
    }
  }, [isAuthenticated, postLogin, navigationRef]);

  // Show loading until auth state is resolved (token check + optional profile fetch)
  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: AppColors.background,
      }}>
        <Text
          style={{ marginTop: 16, fontSize: 16, color: AppColors.text }}
          accessibilityRole="text"
        >
          Loading VOX...
        </Text>
      </View>
    );
  }

  // Protected routes: Main only when authenticated, otherwise Auth
  const initialRouteName: keyof RootStackParamList = isAuthenticated ? 'Main' : 'Auth';
  const initialTab = postLogin ? 'Profile' : 'Messages';

  return (
    <RootStack.Navigator
      key={initialRouteName}
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <RootStack.Screen
        name="Main"
        component={MainNavigator}
        initialParams={{ initialTab }}
      />
      <RootStack.Screen name="Auth" component={AuthNavigator} />
      <RootStack.Screen name="Call" component={CallScreen} />
    </RootStack.Navigator>
  );
}

// Root Layout Component
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  return (
    <Provider store={store}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator navigationRef={navigationRef} />
          <Toast />
          <StatusBar style="auto" />
        </NavigationContainer>
      </ThemeProvider>
    </Provider>
  );
}
