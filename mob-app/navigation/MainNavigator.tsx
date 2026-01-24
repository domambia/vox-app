import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AccessibleButton } from '../components/accessible/AccessibleButton';
import { announceToScreenReader } from '../services/accessibility/accessibilityUtils';
import type { RootStackParamList } from './types';

// Placeholder screens - will be implemented
const DiscoverScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Discover Screen</Text>
  </View>
);

const MessagesScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Messages Screen</Text>
  </View>
);

const GroupsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Groups Screen</Text>
  </View>
);

const EventsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Events Screen</Text>
  </View>
);

const ProfileScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleOpenAuth = () => {
    announceToScreenReader('Navigating to login and registration screens');
    navigation.navigate('Auth');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
      <Text>Profile Screen</Text>
      <AccessibleButton
        title="Open Login and Registration"
        onPress={handleOpenAuth}
        variant="outline"
        size="medium"
        accessibilityHint="Open authentication screens"
        style={{ marginTop: 16 }}
      />
    </View>
  );
};

export type MainTabParamList = {
  Discover: undefined;
  Messages: undefined;
  Groups: undefined;
  Events: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Main Tab Navigator for authenticated users
 * Accessible tab navigation with proper labels and hints
 */
export const MainNavigator: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'Main'>>();
  const initialTab = route.params?.initialTab ?? 'Messages';

  return (
    <Tab.Navigator
      initialRouteName={initialTab}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          minHeight: 60, // Larger touch targets for accessibility
          paddingBottom: 8,
          paddingTop: 8,
        },
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
        component={DiscoverScreen}
        options={{
          title: 'Discover',
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: 'Messages',
        }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupsScreen}
        options={{
          title: 'Groups',
        }}
      />
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{
          title: 'Events',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};
