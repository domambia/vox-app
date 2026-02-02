import React, { useEffect, useState, useMemo } from 'react';
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
import { AppColors } from '../../constants/theme';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { FilterPanel, FilterGroup } from '../../components/accessible/FilterPanel';
import { OfflineBanner } from '../../components/accessible/OfflineBanner';
import { useVoiceCommands } from '../../hooks/useVoiceCommands';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { hapticService } from '../../services/accessibility/hapticService';
import { discoveryService } from '../../services/api/discoveryService';
import { profileService } from '../../services/api/profileService';
import { showToast } from '../../store/slices/toastSlice';
import { useAppDispatch } from '../../hooks';
import { ErrorView } from '@/components/accessible/ErrorView';
import { LoadingSkeleton } from '@/components/accessible/LoadingSkeleton';

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

function mapApiToDiscoverProfile(raw: any): DiscoverProfile {
  const userId = raw.user_id ?? raw.userId ?? '';
  const user = raw.user ?? {};
  const firstName = user.first_name ?? user.firstName ?? '';
  const lastName = user.last_name ?? user.lastName ?? '';
  const interests = Array.isArray(raw.interests) ? raw.interests : [];
  const lookingFor = (raw.looking_for ?? raw.lookingFor ?? 'ALL').toLowerCase();
  const matchScore = raw.matchScore != null ? Math.round((raw.matchScore as number) * 100) : undefined;
  return {
    userId,
    firstName,
    lastName,
    bio: raw.bio ?? undefined,
    interests,
    location: raw.location ?? undefined,
    lookingFor: lookingFor as DiscoverProfile['lookingFor'],
    voiceBioUrl: raw.voice_bio_url ?? raw.voiceBioUrl,
    matchScore,
    distance: raw.distance,
    isLiked: false,
  };
}

const { width } = Dimensions.get('window');

/**
 * Discover Screen - Profile discovery (real data from API)
 */
export const DiscoverScreen: React.FC = () => {
  const navigation = useNavigation<DiscoverScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [showFilters, setShowFilters] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  const { registerCommand } = useVoiceCommands('Discover');
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({
    lookingFor: [],
    location: [],
  });

  const loadProfiles = async () => {
    setLoading(true);
    setDiscoverError(null);
    try {
      const result = await discoveryService.discoverProfiles({ limit: 30 });
      const list = Array.isArray(result.data) ? result.data.map(mapApiToDiscoverProfile) : [];
      setProfiles(list);
      setCurrentIndex(0);
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message ?? e?.message ?? 'Failed to load profiles';
      setDiscoverError(msg);
      if (e?.response?.status === 404) {
        dispatch(showToast({ message: 'Create your profile first to discover others', type: 'info' }));
      }
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (profiles.length > 0 || !loading) {
      setTimeout(() => announceToScreenReader(`Discover. ${profiles.length} profiles to discover.`), 500);
    }
  }, [profiles.length, loading]);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await announceToScreenReader('Refreshing profiles');
    await loadProfiles();
    setRefreshing(false);
    announceToScreenReader('Profiles updated');
  };

  const handleLike = async (profile: DiscoverProfile) => {
    hapticService.light();
    try {
      const res = await profileService.likeProfile(profile.userId);
      const isMatch = res?.isMatch === true;
      await announceToScreenReader(`Liked ${profile.firstName} ${profile.lastName}`);
      if (isMatch) {
        dispatch(showToast({ message: `It's a match! You and ${profile.firstName} liked each other!`, type: 'success' }));
        await announceToScreenReader(`It's a match! You and ${profile.firstName} liked each other!`, { isAlert: true });
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message ?? e?.message ?? 'Failed to like';
      dispatch(showToast({ message: msg, type: 'error' }));
      return;
    }
    setProfiles(prev => prev.filter(p => p.userId !== profile.userId));
    if (currentIndex >= profiles.length - 1) setCurrentIndex(Math.max(0, profiles.length - 2));
    else setCurrentIndex(currentIndex + 1);
  };

  const handleSuperLike = async (profile: DiscoverProfile) => {
    hapticService.success();
    await announceToScreenReader(`Super liked ${profile.firstName} ${profile.lastName}. They'll be notified!`);
    await handleLike(profile);
  };

  const handlePass = async (profile: DiscoverProfile) => {
    hapticService.light();
    await announceToScreenReader(`Passed on ${profile.firstName} ${profile.lastName}`);
    setProfiles(prev => prev.filter(p => p.userId !== profile.userId));
    if (currentIndex >= profiles.length - 1) {
      setCurrentIndex(Math.max(0, profiles.length - 2));
      announceToScreenReader('No more profiles to discover. Pull down to refresh.');
    } else {
      setCurrentIndex(currentIndex + 1);
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

  const safeIndex = Math.min(currentIndex, Math.max(0, filteredProfiles.length - 1));
  const currentProfile = filteredProfiles[safeIndex];

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

    // Super like command
    unsubscribes.push(
      registerCommand('super_like', () => {
        if (currentProfile) {
          handleSuperLike(currentProfile);
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
            <Ionicons name="close" size={24} color={AppColors.error} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.swipeButton, styles.superLikeButton]}
            onPress={() => handleSuperLike(profile)}
            accessibilityRole="button"
            accessibilityLabel={`Super like ${profile.firstName}`}
            accessibilityHint="Super like this profile. They'll be notified!"
          >
            <Ionicons name="star" size={24} color="#FFD700" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.swipeButton, styles.likeButton]}
            onPress={() => handleLike(profile)}
            accessibilityRole="button"
            accessibilityLabel={`Like ${profile.firstName}`}
            accessibilityHint="Like this profile"
          >
            <Ionicons name="heart" size={24} color={AppColors.primary} />
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
            <Ionicons name="heart" size={20} color={AppColors.primary} />
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
      <Ionicons name="people-outline" size={64} color={AppColors.textSecondary} />
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
              <Ionicons name="grid-outline" size={24} color={AppColors.primary} />
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
              <Ionicons name="filter-outline" size={24} color={AppColors.primary} />
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
            <Ionicons name="list-outline" size={24} color={AppColors.primary} />
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
            <Ionicons name="filter-outline" size={24} color={AppColors.primary} />
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

      {discoverError ? (
        <ErrorView message={discoverError} onRetry={handleRefresh} />
      ) : null}
      {loading ? (
        <LoadingSkeleton type="list" />
      ) : (
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

          {safeIndex < filteredProfiles.length - 1 && filteredProfiles.length > 0 && (
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
      )}

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
    backgroundColor: AppColors.inputBg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: AppColors.background,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: AppColors.text,
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
    backgroundColor: AppColors.background,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 12,
  },
  filterPlaceholder: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontStyle: 'italic',
  },
  errorBanner: {
    backgroundColor: AppColors.errorBgLight,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: AppColors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: AppColors.background,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: AppColors.black,
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
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: AppColors.background,
  },
  matchScoreBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: AppColors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  matchScoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.background,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 4,
  },
  profileLocation: {
    fontSize: 16,
    color: AppColors.textSecondary,
  },
  bioSection: {
    marginBottom: 16,
  },
  bio: {
    fontSize: 16,
    color: AppColors.text,
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
    color: AppColors.textSecondary,
  },
  lookingForValue: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primary,
  },
  interestsSection: {
    marginBottom: 24,
  },
  interestsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
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
    backgroundColor: AppColors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  interestText: {
    fontSize: 14,
    color: AppColors.text,
    fontWeight: '500',
  },
  moreInterests: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontStyle: 'italic',
  },
  actionButtons: {
    gap: 12,
  },
  viewButton: {
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  viewButtonText: {
    color: AppColors.primary,
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
    borderColor: AppColors.error,
    backgroundColor: AppColors.background,
  },
  superLikeButton: {
    borderColor: AppColors.warning,
    backgroundColor: AppColors.background,
    borderWidth: 2,
  },
  likeButton: {
    borderColor: AppColors.success,
    backgroundColor: AppColors.background,
  },
  navigationHint: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  navigationHintText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  navigationHintSubtext: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  listView: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: AppColors.background,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
    alignItems: 'center',
    minHeight: 80,
  },
  listAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.background,
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
    color: AppColors.text,
  },
  listMatchScore: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.success,
  },
  listBio: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  listFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listInterests: {
    fontSize: 12,
    color: AppColors.textSecondary,
    flex: 1,
  },
  listLocation: {
    fontSize: 12,
    color: AppColors.textSecondary,
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
    color: AppColors.text,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: AppColors.textSecondary,
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
    backgroundColor: AppColors.background,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: AppColors.inputBg,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  quickActionButtonText: {
    color: AppColors.primary,
    fontSize: 14,
  },
});
