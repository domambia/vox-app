import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { View, Text } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from './hooks/use-color-scheme';
import { store } from './store';
import { AuthNavigator } from './navigation/AuthNavigator';
import { MainNavigator } from './navigation/MainNavigator';
import { useAppSelector } from './hooks/useAppSelector';
import { useAppDispatch } from './hooks/useAppDispatch';
import { initializeAuth } from './store/slices/authSlice';
import { announceToScreenReader } from './services/accessibility/accessibilityUtils';
import type { RootStackParamList } from './navigation/types';

// App Navigator Component (inside Redux Provider)
const RootStack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator({ navigationRef }: { navigationRef: ReturnType<typeof useNavigationContainerRef<RootStackParamList>> }) {
  const { isAuthenticated, isLoading } = useAppSelector((state: any) => state.auth);
  const dispatch = useAppDispatch();
  const allowUnauthenticatedNavigation = true;

  console.log('AppNavigator render:', { isAuthenticated, isLoading });

  useEffect(() => {
    console.log('AppNavigator mounted, dispatching initializeAuth');
    // Initialize auth state on app launch
    dispatch(initializeAuth());
  }, [dispatch]);

  useEffect(() => {
    // Announce app launch to screen readers
    announceToScreenReader('VOX app launched. A community for blind and visually impaired people.');
  }, []);

  useEffect(() => {
    if (!navigationRef.isReady() || !isAuthenticated) return;

    navigationRef.navigate('Main', { initialTab: 'Messages' });
  }, [isAuthenticated, navigationRef]);

  if (isLoading) {
    console.log('Showing loading screen');
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff'
      }}>
        <Text
          style={{ marginTop: 16, fontSize: 16 }}
          accessibilityRole="text"
        >
          Loading VOX...
        </Text>
      </View>
    );
  }

  const initialRouteName: keyof RootStackParamList =
    isAuthenticated || allowUnauthenticatedNavigation ? 'Main' : 'Auth';

  console.log('Rendering navigator:', initialRouteName);

  return (
    <RootStack.Navigator
      key={initialRouteName}
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <RootStack.Screen
        name="Main"
        component={MainNavigator}
        initialParams={{ initialTab: 'Messages' }}
      />
      <RootStack.Screen name="Auth" component={AuthNavigator} />
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
        <NavigationContainer
          ref={navigationRef}
          onReady={() => {
            console.log('Navigation container ready');
          }}
          onStateChange={(state) => {
            console.log('Navigation state changed:', state);
          }}
        >
          <AppNavigator navigationRef={navigationRef} />
          <StatusBar style="auto" />
        </NavigationContainer>
      </ThemeProvider>
    </Provider>
  );
}
