import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { FilterPanel, FilterGroup } from '../../components/accessible/FilterPanel';
import { OfflineBanner } from '../../components/accessible/OfflineBanner';
import { useVoiceCommands } from '../../hooks/useVoiceCommands';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

type DiscoverScreenNavigationProp = NativeStackNavigationProp<import('../../navigation/MainNavigator').DiscoverStackParamList>;

interface DiscoverProfile {
  userId: string;
  firstName: string;
  lastName: string;
  bio?: string;
  interests: string[];
  location?: string;
  lookingFor: 'dating' | 'friendship' | 'hobby' | 'all';
  voiceBioUrl?: string;
  matchScore?: number;
  distance?: number;
  isLiked: boolean;
}

// Mock discovery profiles
const mockProfiles: DiscoverProfile[] = [
  {
    userId: '1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    bio: 'Music enthusiast and accessibility advocate. Love connecting with people who share similar interests.',
    interests: ['Music', 'Technology', 'Accessibility', 'Gaming'],
    location: 'Valletta, Malta',
    lookingFor: 'friendship',
    matchScore: 85,
    distance: 2.5,
    isLiked: false,
  },
  {
    userId: '2',
    firstName: 'Mike',
    lastName: 'Chen',
    bio: 'Tech professional passionate about making the digital world more accessible.',
    interests: ['Technology', 'Coding', 'Accessibility', 'Photography'],
    location: 'Sliema, Malta',
    lookingFor: 'all',
    matchScore: 78,
    distance: 5.2,
    isLiked: false,
  },
  {
    userId: '3',
    firstName: 'Emma',
    lastName: 'Davis',
    bio: 'Outdoor enthusiast and nature lover. Always up for an adventure!',
    interests: ['Hiking', 'Nature', 'Photography', 'Travel'],
    location: 'St. Julian\'s, Malta',
    lookingFor: 'hobby',
    matchScore: 72,
    distance: 8.1,
    isLiked: true,
  },
  {
    userId: '4',
    firstName: 'James',
    lastName: 'Wilson',
    bio: 'Gamer and tech enthusiast. Love discussing the latest in accessible gaming.',
    interests: ['Gaming', 'Technology', 'Music', 'Movies'],
    location: 'Birgu, Malta',
    lookingFor: 'friendship',
    matchScore: 90,
    distance: 12.3,
    isLiked: false,
  },
];

const { width } = Dimensions.get('window');

/**
 * Discover Screen - Profile discovery with swipeable cards
 * Voice-first design for accessible profile discovery
 */
export const DiscoverScreen: React.FC = () => {
  const navigation = useNavigation<DiscoverScreenNavigationProp>();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>(mockProfiles);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [showFilters, setShowFilters] = useState(false);

  // Voice commands integration
  const { registerCommand } = useVoiceCommands('Discover');
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({
    lookingFor: [],
    location: [],
  });

  // Filter configuration
  const filterGroups: FilterGroup[] = [
    {
      id: 'lookingFor',
      label: 'Looking For',
      multiSelect: false,
      options: [
        { id: 'all', label: 'All', value: 'all' },
        { id: 'dating', label: 'Dating', value: 'dating' },
        { id: 'friendship', label: 'Friendship', value: 'friendship' },
        { id: 'hobby', label: 'Hobbies & Interests', value: 'hobby' },
      ],
    },
  ];

  // Announce screen on load
  useEffect(() => {
    const announceScreen = async () => {
      setTimeout(async () => {
        await announceToScreenReader(
          `Discover screen. ${profiles.length} profiles to discover. Swipe right to like, left to pass. Or use the buttons below.`
        );
      }, 500);
    };

    announceScreen();
  }, [profiles.length]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await announceToScreenReader('Refreshing profiles');

    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
      setCurrentIndex(0);
      announceToScreenReader('Profiles updated');
    }, 1000);
  };

  const handleLike = async (profile: DiscoverProfile) => {
    await announceToScreenReader(`Liked ${profile.firstName} ${profile.lastName}`);

    // Update local state
    setProfiles(prev =>
      prev.map(p =>
        p.userId === profile.userId ? { ...p, isLiked: true } : p
      )
    );

    // Simulate match check
    if (profile.matchScore && profile.matchScore > 80) {
      setTimeout(() => {
        announceToScreenReader(`It's a match! You and ${profile.firstName} liked each other!`, { isAlert: true });
      }, 500);
    }

    // Move to next profile
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePass = async (profile: DiscoverProfile) => {
    await announceToScreenReader(`Passed on ${profile.firstName} ${profile.lastName}`);

    // Move to next profile
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      announceToScreenReader('No more profiles to discover. Pull down to refresh.');
    }
  };

  const handleProfilePress = async (profile: DiscoverProfile) => {
    await announceToScreenReader(`Opening ${profile.firstName} ${profile.lastName}'s profile`);
    navigation.navigate('ProfileDetail', { userId: profile.userId });
  };

  const handleViewMatches = () => {
    announceToScreenReader('Viewing your matches');
    navigation.navigate('Matches');
  };

  const handleViewLikes = () => {
    announceToScreenReader('Viewing likes');
    navigation.navigate('Likes');
  };

  const handleToggleViewMode = () => {
    const newMode = viewMode === 'cards' ? 'list' : 'cards';
    setViewMode(newMode);
    announceToScreenReader(`Switched to ${newMode} view`);
  };

  // Filter profiles based on active filters
  const filteredProfiles = React.useMemo(() => {
    let filtered = profiles;

    // Filter by lookingFor
    const lookingForFilter = activeFilters.lookingFor[0];
    if (lookingForFilter && lookingForFilter !== 'all') {
      filtered = filtered.filter((p) => p.lookingFor === lookingForFilter);
    }

    return filtered;
  }, [profiles, activeFilters]);

  const currentProfile = filteredProfiles[currentIndex];

  // Register screen-specific voice commands
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    // Like command
    unsubscribes.push(
      registerCommand('like_profile', () => {
        if (currentProfile) {
          handleLike(currentProfile);
        }
      })
    );

    // Pass command
    unsubscribes.push(
      registerCommand('pass_profile', () => {
        if (currentProfile) {
          handlePass(currentProfile);
        }
      })
    );

    // Filter command
    unsubscribes.push(
      registerCommand('filter', () => {
        setShowFilters(!showFilters);
        announceToScreenReader(showFilters ? 'Filters closed' : 'Filters opened');
      })
    );

    // Search command
    unsubscribes.push(
      registerCommand('search', () => {
        announceToScreenReader('Search activated');
      })
    );

    // Refresh command
    unsubscribes.push(
      registerCommand('refresh', () => {
        handleRefresh();
      })
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [currentProfile, showFilters, registerCommand]);

  const renderProfileCard = (profile: DiscoverProfile) => (
    <View style={styles.profileCard}>
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
          </Text>
        </View>
        {profile.matchScore && (
          <View style={styles.matchScoreBadge}>
            <Text style={styles.matchScoreText}>{profile.matchScore}% match</Text>
          </View>
        )}
      </View>

      {/* Profile Info */}
      <View style={styles.profileInfo}>
        <Text style={styles.profileName} accessibilityRole="text">
          {profile.firstName} {profile.lastName}
        </Text>
        {profile.location && (
          <Text style={styles.profileLocation} accessibilityRole="text">
            📍 {profile.location}
            {profile.distance && ` • ${profile.distance} km away`}
          </Text>
        )}
      </View>

      {/* Bio */}
      {profile.bio && (
        <View style={styles.bioSection}>
          <Text style={styles.bio} numberOfLines={3} accessibilityRole="text">
            {profile.bio}
          </Text>
        </View>
      )}

      {/* Looking For */}
      <View style={styles.lookingForSection}>
        <Text style={styles.lookingForLabel} accessibilityRole="text">
          Looking for:
        </Text>
        <Text style={styles.lookingForValue} accessibilityRole="text">
          {profile.lookingFor === 'all' ? 'Open to All' :
            profile.lookingFor === 'dating' ? 'Dating' :
              profile.lookingFor === 'friendship' ? 'Friendship' :
                'Hobbies & Interests'}
        </Text>
      </View>

      {/* Interests */}
      <View style={styles.interestsSection}>
        <Text style={styles.interestsLabel} accessibilityRole="text">
          Interests:
        </Text>
        <View style={styles.interestsContainer}>
          {profile.interests.slice(0, 4).map((interest, idx) => (
            <View key={idx} style={styles.interestChip}>
              <Text style={styles.interestText}>{interest}</Text>
            </View>
          ))}
          {profile.interests.length > 4 && (
            <Text style={styles.moreInterests}>+{profile.interests.length - 4} more</Text>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <AccessibleButton
          title="View Profile"
          onPress={() => handleProfilePress(profile)}
          variant="outline"
          size="medium"
          accessibilityHint={`View ${profile.firstName}'s full profile`}
          style={styles.viewButton}
          textStyle={styles.viewButtonText}
        />
        <View style={styles.swipeButtons}>
          <TouchableOpacity
            style={[styles.swipeButton, styles.passButton]}
            onPress={() => handlePass(profile)}
            accessibilityRole="button"
            accessibilityLabel={`Pass on ${profile.firstName}`}
            accessibilityHint="Skip this profile"
          >
            <Ionicons name="close" size={24} color="#FF3B30" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.swipeButton, styles.likeButton]}
            onPress={() => handleLike(profile)}
            accessibilityRole="button"
            accessibilityLabel={`Like ${profile.firstName}`}
            accessibilityHint="Like this profile"
          >
            <Ionicons name="heart" size={24} color="#34C759" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderListView = () => (
    <FlatList
      data={profiles}
      keyExtractor={(item) => item.userId}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => handleProfilePress(item)}
          accessibilityRole="button"
          accessibilityLabel={`${item.firstName} ${item.lastName}. ${item.bio || 'No bio'}. ${item.interests.length} interests. ${item.matchScore ? `${item.matchScore}% match` : ''}`}
          accessibilityHint="Double tap to view full profile"
        >
          <View style={styles.listAvatar}>
            <Text style={styles.listAvatarText}>
              {item.firstName.charAt(0)}{item.lastName.charAt(0)}
            </Text>
          </View>
          <View style={styles.listContent}>
            <View style={styles.listHeader}>
              <Text style={styles.listName}>
                {item.firstName} {item.lastName}
              </Text>
              {item.matchScore && (
                <Text style={styles.listMatchScore}>{item.matchScore}%</Text>
              )}
            </View>
            {item.bio && (
              <Text style={styles.listBio} numberOfLines={1}>
                {item.bio}
              </Text>
            )}
            <View style={styles.listFooter}>
              <Text style={styles.listInterests}>
                {item.interests.slice(0, 3).join(' • ')}
              </Text>
              {item.location && (
                <Text style={styles.listLocation}>📍 {item.location}</Text>
              )}
            </View>
          </View>
          {item.isLiked && (
            <Ionicons name="heart" size={20} color="#34C759" />
          )}
        </TouchableOpacity>
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          accessibilityLabel="Pull to refresh profiles"
        />
      }
      style={styles.listView}
      showsVerticalScrollIndicator={false}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#CCCCCC" />
      <Text style={styles.emptyTitle} accessibilityRole="header">
        No more profiles
      </Text>
      <Text style={styles.emptyDescription} accessibilityRole="text">
        You've seen all available profiles.{'\n'}
        Pull down to refresh and discover more!
      </Text>
      <AccessibleButton
        title="Refresh"
        onPress={handleRefresh}
        variant="primary"
        style={styles.refreshButton}
        textStyle={styles.refreshButtonText}
        accessibilityHint="Refresh to see more profiles"
      />
    </View>
  );

  if (viewMode === 'list') {
    return (
      <SafeAreaView style={styles.container}>
        <OfflineBanner />
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Discover
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerAction}
              onPress={handleToggleViewMode}
              accessibilityRole="button"
              accessibilityLabel="Switch to card view"
              accessibilityHint="Change view mode to cards"
            >
              <Ionicons name="grid-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerAction}
              onPress={() => {
                setShowFilters(!showFilters);
                announceToScreenReader(showFilters ? 'Filters closed' : 'Filters opened');
              }}
              accessibilityRole="button"
              accessibilityLabel="Filter options"
              accessibilityHint="Open filter options"
            >
              <Ionicons name="filter-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {showFilters && (
          <View style={styles.filtersContainer}>
            <Text style={styles.filterTitle} accessibilityRole="header">
              Filters
            </Text>
            {/* TODO: Add filter inputs */}
            <Text style={styles.filterPlaceholder} accessibilityRole="text">
              Filter options coming soon
            </Text>
          </View>
        )}

        {renderListView()}

        <View style={styles.quickActions}>
          <AccessibleButton
            title="My Matches"
            onPress={handleViewMatches}
            variant="secondary"
            size="small"
            accessibilityHint="View your matches"
            style={styles.quickActionButton}
            textStyle={styles.quickActionButtonText}
          />
          <AccessibleButton
            title="Likes"
            onPress={handleViewLikes}
            variant="secondary"
            size="small"
            accessibilityHint="View likes you've given and received"
            style={styles.quickActionButton}
            textStyle={styles.quickActionButtonText}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Discover
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerAction}
            onPress={handleToggleViewMode}
            accessibilityRole="button"
            accessibilityLabel="Switch to list view"
            accessibilityHint="Change view mode to list"
          >
            <Ionicons name="list-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerAction}
            onPress={() => {
              setShowFilters(!showFilters);
              announceToScreenReader(showFilters ? 'Filters closed' : 'Filters opened');
            }}
            accessibilityRole="button"
            accessibilityLabel="Filter options"
            accessibilityHint="Open filter options"
          >
            <Ionicons name="filter-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {showFilters && (
        <FilterPanel
          filters={filterGroups}
          activeFilters={activeFilters}
          onFilterChange={(filterId, values) => {
            setActiveFilters((prev) => ({ ...prev, [filterId]: values }));
          }}
          onClearAll={() => {
            setActiveFilters({ lookingFor: [], location: [] });
            announceToScreenReader('All filters cleared');
          }}
          onApply={() => {
            setShowFilters(false);
            setCurrentIndex(0);
            const filterCount = Object.values(activeFilters).reduce((sum, values) => sum + values.length, 0);
            announceToScreenReader(`Filters applied. ${filteredProfiles.length} profiles found.`);
          }}
        />
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            accessibilityLabel="Pull to refresh profiles"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {currentProfile ? (
          renderProfileCard(currentProfile)
        ) : (
          renderEmptyState()
        )}

        {currentIndex < filteredProfiles.length - 1 && (
          <View style={styles.navigationHint}>
            <Text style={styles.navigationHintText} accessibilityRole="text">
              Profile {currentIndex + 1} of {filteredProfiles.length}
            </Text>
            <Text style={styles.navigationHintSubtext} accessibilityRole="text">
              Use buttons below to like or pass, or swipe to navigate
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.quickActions}>
        <AccessibleButton
          title="My Matches"
          onPress={handleViewMatches}
          variant="secondary"
          size="small"
          accessibilityHint="View your matches"
          style={styles.quickActionButton}
          textStyle={styles.quickActionButtonText}
        />
        <AccessibleButton
          title="Likes"
          onPress={handleViewLikes}
          variant="secondary"
          size="small"
          accessibilityHint="View likes you've given and received"
          style={styles.quickActionButton}
          textStyle={styles.quickActionButtonText}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  filterPlaceholder: {
    fontSize: 14,
    color: '#6C757D',
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    minHeight: 500,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  matchScoreBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  matchScoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  profileLocation: {
    fontSize: 16,
    color: '#6C757D',
  },
  bioSection: {
    marginBottom: 16,
  },
  bio: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    textAlign: 'center',
  },
  lookingForSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  lookingForLabel: {
    fontSize: 14,
    color: '#6C757D',
  },
  lookingForValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  interestsSection: {
    marginBottom: 24,
  },
  interestsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  interestChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  interestText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  moreInterests: {
    fontSize: 14,
    color: '#6C757D',
    fontStyle: 'italic',
  },
  actionButtons: {
    gap: 12,
  },
  viewButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  viewButtonText: {
    color: '#007AFF',
  },
  swipeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  swipeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  passButton: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFFFFF',
  },
  likeButton: {
    borderColor: '#34C759',
    backgroundColor: '#FFFFFF',
  },
  navigationHint: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  navigationHintText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C757D',
    marginBottom: 4,
  },
  navigationHintSubtext: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
  },
  listView: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    minHeight: 80,
  },
  listAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  listName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  listMatchScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
  listBio: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 8,
  },
  listFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listInterests: {
    fontSize: 12,
    color: '#6C757D',
    flex: 1,
  },
  listLocation: {
    fontSize: 12,
    color: '#6C757D',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    minHeight: 400,
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
  refreshButton: {
    minWidth: 120,
  },
  refreshButtonText: {
    fontSize: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  quickActionButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
});
