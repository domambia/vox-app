import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabParamList, DiscoverStackParamList, MessagesStackParamList, GroupsStackParamList, EventsStackParamList, ProfileStackParamList } from '../types/navigation.types';
import { announceNavigation } from '../services/accessibility/accessibilityUtils';
import { Text } from 'react-native';

// Placeholder screens - will be implemented later
const PlaceholderScreen = ({ route }: any) => (
    <Text style={{ fontSize: 18, padding: 20 }}>
        {route.name} Screen - Coming Soon
    </Text>
);

const Tab = createBottomTabNavigator<MainTabParamList>();
const DiscoverStack = createNativeStackNavigator<DiscoverStackParamList>();
const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const GroupsStack = createNativeStackNavigator<GroupsStackParamList>();
const EventsStack = createNativeStackNavigator<EventsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

// Stack Navigators
const DiscoverNavigator = () => (
    <DiscoverStack.Navigator>
        <DiscoverStack.Screen name="DiscoverFeed" component={PlaceholderScreen} />
        <DiscoverStack.Screen name="ProfileDetail" component={PlaceholderScreen} />
        <DiscoverStack.Screen name="Matches" component={PlaceholderScreen} />
        <DiscoverStack.Screen name="MatchDetail" component={PlaceholderScreen} />
        <DiscoverStack.Screen name="Likes" component={PlaceholderScreen} />
    </DiscoverStack.Navigator>
);

const MessagesNavigator = () => (
    <MessagesStack.Navigator>
        <MessagesStack.Screen name="Conversations" component={PlaceholderScreen} />
        <MessagesStack.Screen name="Chat" component={PlaceholderScreen} />
    </MessagesStack.Navigator>
);

const GroupsNavigator = () => (
    <GroupsStack.Navigator>
        <GroupsStack.Screen name="GroupsList" component={PlaceholderScreen} />
        <GroupsStack.Screen name="GroupDetail" component={PlaceholderScreen} />
        <GroupsStack.Screen name="GroupMembers" component={PlaceholderScreen} />
        <GroupsStack.Screen name="CreateGroup" component={PlaceholderScreen} />
        <GroupsStack.Screen name="EditGroup" component={PlaceholderScreen} />
    </GroupsStack.Navigator>
);

const EventsNavigator = () => (
    <EventsStack.Navigator>
        <EventsStack.Screen name="EventsList" component={PlaceholderScreen} />
        <EventsStack.Screen name="EventDetail" component={PlaceholderScreen} />
        <EventsStack.Screen name="CreateEvent" component={PlaceholderScreen} />
        <EventsStack.Screen name="EditEvent" component={PlaceholderScreen} />
        <EventsStack.Screen name="EventRSVPs" component={PlaceholderScreen} />
    </EventsStack.Navigator>
);

const ProfileNavigator = () => (
    <ProfileStack.Navigator>
        <ProfileStack.Screen name="ProfileView" component={PlaceholderScreen} />
        <ProfileStack.Screen name="ProfileEdit" component={PlaceholderScreen} />
        <ProfileStack.Screen name="VoiceBioRecord" component={PlaceholderScreen} />
        <ProfileStack.Screen name="Settings" component={PlaceholderScreen} />
        <ProfileStack.Screen name="AccountSettings" component={PlaceholderScreen} />
        <ProfileStack.Screen name="PrivacySettings" component={PlaceholderScreen} />
        <ProfileStack.Screen name="NotificationSettings" component={PlaceholderScreen} />
        <ProfileStack.Screen name="AccessibilitySettings" component={PlaceholderScreen} />
        <ProfileStack.Screen name="About" component={PlaceholderScreen} />
    </ProfileStack.Navigator>
);

export const MainNavigator: React.FC = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#007AFF',
                tabBarInactiveTintColor: '#8E8E93',
                tabBarStyle: {
                    height: 88,
                    paddingBottom: 20,
                    paddingTop: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
            }}
            screenListeners={{
                tabPress: (e) => {
                    const routeName = e.target?.split('-')[0];
                    if (routeName) {
                        announceNavigation(routeName);
                    }
                },
            }}
        >
            <Tab.Screen
                name="Discover"
                component={DiscoverNavigator}
                options={{
                    tabBarLabel: 'Discover',
                    tabBarAccessibilityLabel: 'Discover tab. Double tap to view discovery feed.',
                }}
            />
            <Tab.Screen
                name="Messages"
                component={MessagesNavigator}
                options={{
                    tabBarLabel: 'Messages',
                    tabBarAccessibilityLabel: 'Messages tab. Double tap to view conversations.',
                }}
            />
            <Tab.Screen
                name="Groups"
                component={GroupsNavigator}
                options={{
                    tabBarLabel: 'Groups',
                    tabBarAccessibilityLabel: 'Groups tab. Double tap to view groups.',
                }}
            />
            <Tab.Screen
                name="Events"
                component={EventsNavigator}
                options={{
                    tabBarLabel: 'Events',
                    tabBarAccessibilityLabel: 'Events tab. Double tap to view events.',
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileNavigator}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarAccessibilityLabel: 'Profile tab. Double tap to view your profile.',
                }}
            />
        </Tab.Navigator>
    );
};

