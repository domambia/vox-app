import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
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

// App Navigator Component (inside Redux Provider)
function AppNavigator() {
  const { isAuthenticated, isLoading } = useAppSelector((state: any) => state.auth);
  const dispatch = useAppDispatch();

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

  console.log('Rendering navigator:', isAuthenticated ? 'MainNavigator' : 'AuthNavigator');
  return isAuthenticated ? <MainNavigator /> : <AuthNavigator />;
}

// Root Layout Component
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Provider store={store}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <NavigationContainer
          onReady={() => {
            console.log('Navigation container ready');
          }}
          onStateChange={(state) => {
            console.log('Navigation state changed:', state);
          }}
        >
          <AppNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </ThemeProvider>
    </Provider>
  );
}
