import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { socketClient } from '../services/websocket/socketClient';
import { setupSocketEvents, cleanupSocketEvents } from '../services/websocket/socketEvents';

const RootStack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

    useEffect(() => {
        if (isAuthenticated) {
            // Connect to WebSocket when authenticated
            socketClient.connect().catch((error) => {
                console.error('Failed to connect to WebSocket:', error);
            });
            setupSocketEvents();

            return () => {
                cleanupSocketEvents();
                socketClient.disconnect();
            };
        }
    }, [isAuthenticated]);

    return (
        <NavigationContainer>
            <RootStack.Navigator
                screenOptions={{
                    headerShown: false,
                }}
            >
                {!isAuthenticated ? (
                    <RootStack.Screen name="Auth" component={AuthNavigator} />
                ) : (
                    <RootStack.Screen name="Main" component={MainNavigator} />
                )}
            </RootStack.Navigator>
        </NavigationContainer>
    );
};

