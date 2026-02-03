import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { HelpScreen } from '../screens/auth/HelpScreen';
import { OTPVerificationScreen } from '../screens/auth/OTPVerificationScreen';

/** Auth flow is OTP-only (no password login or password reset). */
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  OTPVerification: undefined;
  Help: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Authentication Navigator - Linear flow for voice-first design
 * Uses stack navigation only (no tabs in auth flow)
 */
export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false, // Custom headers for accessibility
        gestureEnabled: false, // Disable swipe gestures for predictability
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{
          title: 'Welcome to LiamApp',
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: 'Log in',
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          title: 'Create Account',
        }}
      />
      <Stack.Screen
        name="OTPVerification"
        component={OTPVerificationScreen}
        options={{
          title: 'Verify Phone',
        }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{
          title: 'How LiamApp Works',
        }}
      />
    </Stack.Navigator>
  );
};
