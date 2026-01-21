import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types/navigation.types';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterStepOneScreen from '../screens/auth/RegisterStepOneScreen';
import RegisterStepTwoScreen from '../screens/auth/RegisterStepTwoScreen';
import RegisterStepThreeScreen from '../screens/auth/RegisterStepThreeScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import VerifyResetTokenScreen from '../screens/auth/VerifyResetTokenScreen';
import CompletePasswordResetScreen from '../screens/auth/CompletePasswordResetScreen';
import HelpScreen from '../screens/auth/HelpScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
    return (
        <Stack.Navigator
            initialRouteName="Welcome"
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="RegisterStepOne" component={RegisterStepOneScreen} />
            <Stack.Screen name="RegisterStepTwo" component={RegisterStepTwoScreen} />
            <Stack.Screen name="RegisterStepThree" component={RegisterStepThreeScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="VerifyResetToken" component={VerifyResetTokenScreen} />
            <Stack.Screen name="CompletePasswordReset" component={CompletePasswordResetScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
        </Stack.Navigator>
    );
};

