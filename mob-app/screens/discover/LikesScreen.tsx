import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { OfflineBanner } from '../../components/accessible/OfflineBanner';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { discoveryService, Like } from '../../services/api/discoveryService';

type LikesScreenNavigationProp = NativeStackNavigationProp<import('../../navigation/MainNavigator').DiscoverStackParamList, 'Likes'>;

interface LikeRow {
    likeId: string;
    userId: string;
    firstName: string;
    lastName: string;
    bio?: string;
    interests: string[];
    location?: string;
    likedAt: string;
    isMatch: boolean;
    type: 'given' | 'received';
}

function mapApiLikeToRow(raw: any, type: 'given' | 'received'): LikeRow {
    const profile = raw.profile ?? raw;
    const userId = profile?.user_id ?? profile?.userId ?? '';
    const firstName = profile?.first_name ?? profile?.firstName ?? '';
    const lastName = profile?.last_name ?? profile?.lastName ?? '';
    const p = profile?.profile ?? profile;
    const interests = Array.isArray(p?.interests) ? p.interests : [];
    return {
        likeId: raw.like_id ?? raw.likeId ?? userId,
        userId,
        firstName,
        lastName,
        bio: p?.bio ?? undefined,
        interests,
        location: p?.location ?? undefined,
        likedAt: raw.created_at ?? raw.createdAt ?? raw.likedAt ?? '',
        isMatch: false,
        type,
    };
}

/**
 * Likes Screen - View likes given and received (real data from API)
 */
export const LikesScreen: React.FC = () => {
    const navigation = useNavigation<LikesScreenNavigationProp>();
    const [givenLikes, setGivenLikes] = useState<LikeRow[]>([]);
    const [receivedLikes, setReceivedLikes] = useState<LikeRow[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'given' | 'received'>('received');

    const loadLikes = async () => {
        setLoading(true);
        try {
            const [given, received] = await Promise.all([
                discoveryService.getLikes({ type: 'given' }),
                discoveryService.getLikes({ type: 'received' }),
            ]);
            setGivenLikes(Array.isArray(given.data) ? given.data.map((r: any) => mapApiLikeToRow(r, 'given')) : []);
            setReceivedLikes(Array.isArray(received.data) ? received.data.map((r: any) => mapApiLikeToRow(r, 'received')) : []);
        } catch {
            setGivenLikes([]);
            setReceivedLikes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLikes();
    }, []);

    const displayedLikes = activeTab === 'given' ? givenLikes : receivedLikes;

    useEffect(() => {
        if (displayedLikes.length > 0 || !loading) {
            setTimeout(() => announceToScreenReader(
                `Likes. ${activeTab === 'given' ? 'Likes you gave' : 'Likes you received'}. ${displayedLikes.length} ${displayedLikes.length === 1 ? 'like' : 'likes'}.`
            ), 500);
        }
    }, [activeTab, displayedLikes.length, loading]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await announceToScreenReader('Refreshing likes');
        await loadLikes();
        setRefreshing(false);
        announceToScreenReader('Likes updated');
    };

    const handleLikePress = async (like: LikeRow) => {
        await announceToScreenReader(`Opening ${like.firstName} ${like.lastName}'s profile`);
        navigation.navigate('ProfileDetail', { userId: like.userId });
    };

    const handleTabChange = (tab: 'given' | 'received') => {
        setActiveTab(tab);
        const tabName = tab === 'given' ? 'Likes you gave' : 'Likes you received';
        announceToScreenReader(`Switched to ${tabName} tab`);
    };

    const formatLikedDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const renderLikeItem = ({ item }: { item: LikeRow }) => (
        <TouchableOpacity
            style={styles.likeItem}
            onPress={() => handleLikePress(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.firstName} ${item.lastName}. ${item.bio || 'No bio'}. ${item.interests.length} interests. ${item.isMatch ? 'It\'s a match!' : 'Not a match yet'}. Liked ${formatLikedDate(item.likedAt)}`}
            accessibilityHint="Double tap to view profile"
        >
            <View style={styles.likeAvatar}>
                <Text style={styles.likeAvatarText}>
                    {item.firstName.charAt(0)}{item.lastName.charAt(0)}
                </Text>
                {item.isMatch && (
                    <View style={styles.matchIndicator}>
                        <Ionicons name="heart" size={16} color={AppColors.white} />
                    </View>
                )}
            </View>

            <View style={styles.likeContent}>
                <View style={styles.likeHeader}>
                    <Text style={styles.likeName} numberOfLines={1}>
                        {item.firstName} {item.lastName}
                    </Text>
                    {item.isMatch && (
                        <View style={styles.matchBadge}>
                            <Text style={styles.matchBadgeText}>Match!</Text>
                        </View>
                    )}
                </View>

                {item.bio && (
                    <Text style={styles.likeBio} numberOfLines={2}>
                        {item.bio}
                    </Text>
                )}

                <View style={styles.likeFooter}>
                    <View style={styles.interestsPreview}>
                        {item.interests.slice(0, 3).map((interest, idx) => (
                            <Text key={idx} style={styles.interestTag}>
                                {interest}
                            </Text>
                        ))}
                    </View>
                    <Text style={styles.likeDate}>
                        {formatLikedDate(item.likedAt)}
                    </Text>
                </View>
            </View>

            <Ionicons
                name={item.type === 'given' ? 'heart' : 'heart-outline'}
                size={24}
                color={item.type === 'given' ? AppColors.success : AppColors.primary}
                style={styles.likeIcon}
            />
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons
                name={activeTab === 'given' ? 'heart-outline' : 'heart'}
                size={64}
                color={AppColors.textSecondary}
            />
            <Text style={styles.emptyTitle} accessibilityRole="header">
                {activeTab === 'given' ? 'No likes given yet' : 'No likes received yet'}
            </Text>
            <Text style={styles.emptyDescription} accessibilityRole="text">
                {activeTab === 'given'
                    ? 'Start discovering profiles and like people you\'re interested in!'
                    : 'When someone likes you, they\'ll appear here. Start discovering to find matches!'
                }
            </Text>
            {activeTab === 'received' && (
                <View style={styles.emptyTips}>
                    <Text style={styles.tipTitle} accessibilityRole="header">
                        Tips to get more likes:
                    </Text>
                    <Text style={styles.tipItem} accessibilityRole="text">
                        • Complete your profile with a detailed bio
                    </Text>
                    <Text style={styles.tipItem} accessibilityRole="text">
                        • Add a voice introduction to stand out
                    </Text>
                    <Text style={styles.tipItem} accessibilityRole="text">
                        • Share your interests and hobbies
                    </Text>
                    <Text style={styles.tipItem} accessibilityRole="text">
                        • Be active in the community
                    </Text>
                </View>
            )}
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
                    Likes
                </Text>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'received' && styles.activeTab]}
                    onPress={() => handleTabChange('received')}
                    accessibilityRole="tab"
                    accessibilityLabel={`Likes you received. ${receivedLikes.length} likes`}
                    accessibilityState={{ selected: activeTab === 'received' }}
                >
                    <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
                        Received ({receivedLikes.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'given' && styles.activeTab]}
                    onPress={() => handleTabChange('given')}
                    accessibilityRole="tab"
                    accessibilityLabel={`Likes you gave. ${givenLikes.length} likes`}
                    accessibilityState={{ selected: activeTab === 'given' }}
                >
                    <Text style={[styles.tabText, activeTab === 'given' && styles.activeTabText]}>
                        Given ({givenLikes.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={AppColors.primary} />
                    <Text style={styles.loadingText}>Loading likes...</Text>
                </View>
            ) : (
                <FlatList
                    data={displayedLikes}
                    keyExtractor={(item) => item.likeId}
                    renderItem={renderLikeItem}
                    ListEmptyComponent={renderEmptyState}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            accessibilityLabel="Pull to refresh likes"
                        />
                    }
                    style={styles.likesList}
                    showsVerticalScrollIndicator={false}
                    accessibilityLabel={`${activeTab === 'given' ? 'Likes you gave' : 'Likes you received'} list`}
                    contentContainerStyle={displayedLikes.length === 0 ? { flex: 1 } : undefined}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: AppColors.border,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: AppColors.text,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: AppColors.inputBg,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 8,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    activeTab: {
        backgroundColor: AppColors.background,
        shadowColor: AppColors.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: AppColors.textSecondary,
    },
    activeTabText: {
        color: AppColors.primary,
    },
    likesList: {
        flex: 1,
    },
    likeItem: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: AppColors.border,
        alignItems: 'center',
        minHeight: 80,
    },
    likeAvatar: {
        position: 'relative',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    likeAvatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: AppColors.white,
    },
    matchIndicator: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: AppColors.success,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: AppColors.white,
    },
    likeContent: {
        flex: 1,
        marginRight: 12,
    },
    likeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    likeName: {
        fontSize: 18,
        fontWeight: '600',
        color: AppColors.text,
        flex: 1,
        marginRight: 8,
    },
    matchBadge: {
        backgroundColor: AppColors.success,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    matchBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: AppColors.white,
    },
    likeBio: {
        fontSize: 14,
        color: AppColors.textSecondary,
        marginBottom: 8,
        lineHeight: 20,
    },
    likeFooter: {
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
        color: AppColors.primary,
        backgroundColor: AppColors.borderLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    likeDate: {
        fontSize: 12,
        color: AppColors.textSecondary,
    },
    likeIcon: {
        marginLeft: 8,
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
        color: AppColors.text,
        marginBottom: 8,
    },
    tipItem: {
        fontSize: 14,
        color: AppColors.textSecondary,
        lineHeight: 20,
        marginBottom: 4,
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
});
