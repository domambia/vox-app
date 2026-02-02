import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../constants/theme';
import { useAppDispatch } from '../hooks';
import { clearPostLogin } from '../store/slices/authSlice';
import { AccessibleButton } from '../components/accessible/AccessibleButton';
import { announceToScreenReader } from '../services/accessibility/accessibilityUtils';
import type { RootStackParamList } from './types';
import { ConversationsScreen } from '../screens/messages/ConversationsScreen';
import { ChatScreen } from '../screens/messages/ChatScreen';
import { GroupsScreen } from '../screens/groups/GroupsScreen';
import { CreateGroupScreen } from '../screens/groups/CreateGroupScreen';
import { GroupChatScreen } from '../screens/groups/GroupChatScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { EventsScreen } from '../screens/events/EventsScreen';
import { CreateEventScreen } from '../screens/events/CreateEventScreen';
import { EventDetailScreen } from '../screens/events/EventDetailScreen';
import { DiscoverScreen } from '../screens/discover/DiscoverScreen';
import { ProfileDetailScreen } from '../screens/discover/ProfileDetailScreen';
import { MatchesScreen } from '../screens/discover/MatchesScreen';
import { LikesScreen } from '../screens/discover/LikesScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { KYCVerificationScreen } from '../screens/profile/KYCVerificationScreen';

// Discover screen is now imported and used in DiscoverStackNavigator

export type MessagesStackParamList = {
  MessagesMain: undefined;
  Chat: { conversationId?: string; participantName: string; participantId?: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Notifications: undefined;
  KYCVerification: undefined;
};

export type GroupsStackParamList = {
  GroupsMain: undefined;
  CreateGroup: undefined;
  GroupChat: { groupId: string; groupName: string };
};

export type EventsStackParamList = {
  EventsMain: undefined;
  CreateEvent: undefined;
  EventDetail: { eventId: string };
};

export type DiscoverStackParamList = {
  DiscoverMain: undefined;
  ProfileDetail: { userId: string };
  Matches: undefined;
  Likes: undefined;
};

const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const GroupsStack = createNativeStackNavigator<GroupsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const EventsStack = createNativeStackNavigator<EventsStackParamList>();
const DiscoverStack = createNativeStackNavigator<DiscoverStackParamList>();

const MessagesStackNavigator = () => (
  <MessagesStack.Navigator screenOptions={{ headerShown: false }}>
    <MessagesStack.Screen name="MessagesMain" component={ConversationsScreen} />
    <MessagesStack.Screen name="Chat" component={ChatScreen} />
  </MessagesStack.Navigator>
);

const GroupsStackNavigator = () => (
  <GroupsStack.Navigator screenOptions={{ headerShown: false }}>
    <GroupsStack.Screen name="GroupsMain" component={GroupsScreen} />
    <GroupsStack.Screen name="CreateGroup" component={CreateGroupScreen} />
    <GroupsStack.Screen name="GroupChat" component={GroupChatScreen} />
  </GroupsStack.Navigator>
);

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
    <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    <ProfileStack.Screen name="Notifications" component={NotificationsScreen} />
    <ProfileStack.Screen name="KYCVerification" component={KYCVerificationScreen} />
  </ProfileStack.Navigator>
);

const EventsStackNavigator = () => (
  <EventsStack.Navigator screenOptions={{ headerShown: false }}>
    <EventsStack.Screen name="EventsMain" component={EventsScreen} />
    <EventsStack.Screen name="CreateEvent" component={CreateEventScreen} />
    <EventsStack.Screen name="EventDetail" component={EventDetailScreen} />
  </EventsStack.Navigator>
);

const DiscoverStackNavigator = () => (
  <DiscoverStack.Navigator screenOptions={{ headerShown: false }}>
    <DiscoverStack.Screen name="DiscoverMain" component={DiscoverScreen} />
    <DiscoverStack.Screen name="ProfileDetail" component={ProfileDetailScreen} />
    <DiscoverStack.Screen name="Matches" component={MatchesScreen} />
    <DiscoverStack.Screen name="Likes" component={LikesScreen} />
  </DiscoverStack.Navigator>
);

export type MainTabParamList = {
  Discover: undefined;
  Messages: undefined;
  Groups: undefined;
  Events: undefined;
  Profile: undefined;
  Chat: { conversationId?: string; participantName: string; participantId?: string };
  GroupChat: { groupId: string; groupName: string };
  EditProfile: undefined;
  CreateEvent: undefined;
  EventDetail: { eventId: string };
  ProfileDetail: { userId: string };
  Matches: undefined;
  Likes: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Main Tab Navigator for authenticated users
 * Accessible tab navigation with proper labels and hints
 */
export const MainNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const route = useRoute<RouteProp<RootStackParamList, 'Main'>>();
  const initialTab = route.params?.initialTab ?? 'Messages';

  useEffect(() => {
    dispatch(clearPostLogin());
  }, [dispatch]);

  return (
    <Tab.Navigator
      initialRouteName={initialTab}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          minHeight: 60,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: AppColors.background,
          borderTopColor: AppColors.border,
        },
        tabBarActiveTintColor: AppColors.primary,
        tabBarInactiveTintColor: AppColors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Discover':
              iconName = focused ? 'heart' : 'heart-outline';
              break;
            case 'Messages':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Groups':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Events':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarAccessibilityLabel: (route.name === 'Discover' ? 'Discover matches' :
          route.name === 'Messages' ? 'Messages' :
            route.name === 'Groups' ? 'Community groups' :
              route.name === 'Events' ? 'Events' :
                route.name === 'Profile' ? 'My profile' : route.name),
        tabBarAccessibilityHint: `Navigate to ${route.name.toLowerCase()} tab`,
      })}
      screenListeners={{
        tabPress: (e) => {
          // Announce tab changes for accessibility
          const routeName = e.target?.split('-')[0] || '';
          // Announcement will be handled by navigation state changes
        },
      }}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverStackNavigator}
        options={{
          title: 'Discover',
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesStackNavigator}
        options={{
          title: 'Messages',
        }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupsStackNavigator}
        options={{
          title: 'Groups',
        }}
      />
      <Tab.Screen
        name="Events"
        component={EventsStackNavigator}
        options={{
          title: 'Events',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};
