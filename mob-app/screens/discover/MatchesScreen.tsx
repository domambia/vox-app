import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { OfflineBanner } from '../../components/accessible/OfflineBanner';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

type MatchesScreenNavigationProp = NativeStackNavigationProp<import('../../navigation/MainNavigator').DiscoverStackParamList, 'Matches'>;

interface Match {
  matchId: string;
  userId: string;
  firstName: string;
  lastName: string;
  bio?: string;
  interests: string[];
  location?: string;
  matchedAt: string;
  lastMessage?: string;
  unreadCount: number;
}

// Mock matches data
const mockMatches: Match[] = [
  {
    matchId: '1',
    userId: '1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    bio: 'Music enthusiast and accessibility advocate.',
    interests: ['Music', 'Technology', 'Accessibility'],
    location: 'Valletta, Malta',
    matchedAt: '2025-01-20T10:30:00Z',
    lastMessage: 'Hey! How are you doing?',
    unreadCount: 2,
  },
  {
    matchId: '2',
    userId: '2',
    firstName: 'Mike',
    lastName: 'Chen',
    bio: 'Tech professional passionate about accessibility.',
    interests: ['Technology', 'Coding', 'Accessibility'],
    location: 'Sliema, Malta',
    matchedAt: '2025-01-19T14:20:00Z',
    lastMessage: 'Thanks for the great conversation!',
    unreadCount: 0,
  },
  {
    matchId: '3',
    userId: '3',
    firstName: 'Emma',
    lastName: 'Davis',
    bio: 'Outdoor enthusiast and nature lover.',
    interests: ['Hiking', 'Nature', 'Photography'],
    location: 'St. Julian\'s, Malta',
    matchedAt: '2025-01-18T09:15:00Z',
    lastMessage: 'See you at the event tomorrow!',
    unreadCount: 1,
  },
];

/**
 * Matches Screen - List of all matches
 * Voice-first design for accessible match viewing
 */
export const MatchesScreen: React.FC = () => {
  const navigation = useNavigation<MatchesScreenNavigationProp>();
  const [matches, setMatches] = useState<Match[]>(mockMatches);
  const [refreshing, setRefreshing] = useState(false);

  // Announce screen on load
  useEffect(() => {
    const announceScreen = async () => {
      setTimeout(async () => {
        await announceToScreenReader(
          `Matches screen. ${matches.length} matches. Double tap any match to start chatting.`
        );
      }, 500);
    };

    announceScreen();
  }, [matches.length]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await announceToScreenReader('Refreshing matches');

    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
      announceToScreenReader('Matches updated');
    }, 1000);
  };

  const handleMatchPress = async (match: Match) => {
    await announceToScreenReader(`Opening chat with ${match.firstName} ${match.lastName}`);
    // Navigate to Messages tab and then to Chat screen
    const rootNavigation = navigation.getParent()?.getParent();
    if (rootNavigation) {
      rootNavigation.dispatch(
        CommonActions.navigate({
          name: 'Messages',
          params: {
            screen: 'Chat',
            params: {
              conversationId: match.userId,
              participantName: `${match.firstName} ${match.lastName}`,
            },
          },
        })
      );
    }
  };

  const handleViewProfile = async (match: Match) => {
    await announceToScreenReader(`Viewing ${match.firstName} ${match.lastName}'s profile`);
    navigation.navigate('ProfileDetail', { userId: match.userId });
  };

  const formatMatchedDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Matched today';
    } else if (diffDays === 1) {
      return 'Matched yesterday';
    } else if (diffDays < 7) {
      return `Matched ${diffDays} days ago`;
    } else {
      return `Matched on ${date.toLocaleDateString()}`;
    }
  };

  const renderMatchItem = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.matchItem}
      onPress={() => handleMatchPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.firstName} ${item.lastName}. ${formatMatchedDate(item.matchedAt)}. ${item.lastMessage || 'No messages yet'}. ${item.unreadCount > 0 ? `${item.unreadCount} unread messages` : 'No unread messages'}`}
      accessibilityHint="Double tap to open chat"
    >
      <View style={styles.matchAvatar}>
        <Text style={styles.matchAvatarText}>
          {item.firstName.charAt(0)}{item.lastName.charAt(0)}
        </Text>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.matchContent}>
        <View style={styles.matchHeader}>
          <Text style={styles.matchName} numberOfLines={1}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.matchDate}>
            {formatMatchedDate(item.matchedAt)}
          </Text>
        </View>

        {item.lastMessage && (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        )}

        <View style={styles.matchFooter}>
          <View style={styles.interestsPreview}>
            {item.interests.slice(0, 3).map((interest, idx) => (
              <Text key={idx} style={styles.interestTag}>
                {interest}
              </Text>
            ))}
          </View>
          {item.location && (
            <Text style={styles.location}>📍 {item.location}</Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => handleViewProfile(item)}
        accessibilityRole="button"
        accessibilityLabel={`View ${item.firstName}'s profile`}
        accessibilityHint="View full profile details"
      >
        <Ionicons name="person-outline" size={20} color="#007AFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="heart-outline" size={64} color="#CCCCCC" />
      <Text style={styles.emptyTitle} accessibilityRole="header">
        No matches yet
      </Text>
      <Text style={styles.emptyDescription} accessibilityRole="text">
        Start discovering profiles and like people you're interested in.{'\n'}
        When they like you back, it's a match!
      </Text>
      <View style={styles.emptyTips}>
        <Text style={styles.tipTitle} accessibilityRole="header">
          Tips to get more matches:
        </Text>
        <Text style={styles.tipItem} accessibilityRole="text">
          • Complete your profile with a bio and interests
        </Text>
        <Text style={styles.tipItem} accessibilityRole="text">
          • Add a voice introduction
        </Text>
        <Text style={styles.tipItem} accessibilityRole="text">
          • Like profiles that interest you
        </Text>
        <Text style={styles.tipItem} accessibilityRole="text">
          • Be active in groups and events
        </Text>
      </View>
      <AccessibleButton
        title="Start Discovering"
        onPress={() => {
          announceToScreenReader('Navigating to discover');
          navigation.navigate('DiscoverMain');
        }}
        variant="primary"
        style={styles.discoverButton}
        textStyle={styles.discoverButtonText}
        accessibilityHint="Go to discover screen to find profiles"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Matches
        </Text>
        <Text style={styles.subtitle} accessibilityRole="text">
          {matches.length} {matches.length === 1 ? 'match' : 'matches'}
        </Text>
      </View>

      <FlatList
        data={matches}
        keyExtractor={(item) => item.matchId}
        renderItem={renderMatchItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            accessibilityLabel="Pull to refresh matches"
          />
        }
        style={styles.matchesList}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="Matches list"
        contentContainerStyle={matches.length === 0 ? { flex: 1 } : undefined}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6C757D',
  },
  matchesList: {
    flex: 1,
  },
  matchItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
    alignItems: 'center',
    minHeight: 80,
  },
  matchAvatar: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  matchAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  matchContent: {
    flex: 1,
    marginRight: 12,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  matchName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginRight: 8,
  },
  matchDate: {
    fontSize: 12,
    color: '#6C757D',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 8,
  },
  matchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  interestsPreview: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  interestTag: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  location: {
    fontSize: 12,
    color: '#6C757D',
  },
  profileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  discoverButton: {
    minWidth: 160,
  },
  discoverButtonText: {
    fontSize: 16,
  },
  emptyTips: {
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 20,
    marginBottom: 4,
  },
});
