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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

type LikesScreenNavigationProp = NativeStackNavigationProp<import('../../navigation/MainNavigator').DiscoverStackParamList, 'Likes'>;

interface Like {
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

// Mock likes data
const mockLikes: Like[] = [
    {
        likeId: '1',
        userId: '1',
        firstName: 'Sarah',
        lastName: 'Johnson',
        bio: 'Music enthusiast and accessibility advocate.',
        interests: ['Music', 'Technology', 'Accessibility'],
        location: 'Valletta, Malta',
        likedAt: '2025-01-20T10:30:00Z',
        isMatch: true,
        type: 'given',
    },
    {
        likeId: '2',
        userId: '2',
        firstName: 'Mike',
        lastName: 'Chen',
        bio: 'Tech professional passionate about accessibility.',
        interests: ['Technology', 'Coding', 'Accessibility'],
        location: 'Sliema, Malta',
        likedAt: '2025-01-19T14:20:00Z',
        isMatch: false,
        type: 'given',
    },
    {
        likeId: '3',
        userId: '3',
        firstName: 'Emma',
        lastName: 'Davis',
        bio: 'Outdoor enthusiast and nature lover.',
        interests: ['Hiking', 'Nature', 'Photography'],
        location: 'St. Julian\'s, Malta',
        likedAt: '2025-01-18T09:15:00Z',
        isMatch: false,
        type: 'received',
    },
    {
        likeId: '4',
        userId: '4',
        firstName: 'James',
        lastName: 'Wilson',
        bio: 'Gamer and tech enthusiast.',
        interests: ['Gaming', 'Technology', 'Music'],
        location: 'Birgu, Malta',
        likedAt: '2025-01-17T16:45:00Z',
        isMatch: false,
        type: 'received',
    },
];

/**
 * Likes Screen - View likes given and received
 * Voice-first design for accessible like management
 */
export const LikesScreen: React.FC = () => {
    const navigation = useNavigation<LikesScreenNavigationProp>();
    const [likes, setLikes] = useState<Like[]>(mockLikes);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'given' | 'received'>('received');

    // Filter likes by type
    const givenLikes = likes.filter(like => like.type === 'given');
    const receivedLikes = likes.filter(like => like.type === 'received');

    const displayedLikes = activeTab === 'given' ? givenLikes : receivedLikes;

    // Announce screen on load
    useEffect(() => {
        const announceScreen = async () => {
            setTimeout(async () => {
                await announceToScreenReader(
                    `Likes screen. ${activeTab === 'given' ? 'Likes you gave' : 'Likes you received'}. ${displayedLikes.length} ${displayedLikes.length === 1 ? 'like' : 'likes'}.`
                );
            }, 500);
        };

        announceScreen();
    }, [activeTab, displayedLikes.length]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await announceToScreenReader('Refreshing likes');

        // Simulate API call
        setTimeout(() => {
            setRefreshing(false);
            announceToScreenReader('Likes updated');
        }, 1000);
    };

    const handleLikePress = async (like: Like) => {
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

    const renderLikeItem = ({ item }: { item: Like }) => (
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
                        <Ionicons name="heart" size={16} color="#FFFFFF" />
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
                color={item.type === 'given' ? '#34C759' : '#007AFF'}
                style={styles.likeIcon}
            />
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons
                name={activeTab === 'given' ? 'heart-outline' : 'heart'}
                size={64}
                color="#CCCCCC"
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
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F8F9FA',
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
        backgroundColor: '#FFFFFF',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6C757D',
    },
    activeTabText: {
        color: '#007AFF',
    },
    likesList: {
        flex: 1,
    },
    likeItem: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E5',
        alignItems: 'center',
        minHeight: 80,
    },
    likeAvatar: {
        position: 'relative',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    likeAvatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    matchIndicator: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#34C759',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
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
        color: '#000000',
        flex: 1,
        marginRight: 8,
    },
    matchBadge: {
        backgroundColor: '#34C759',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    matchBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    likeBio: {
        fontSize: 14,
        color: '#6C757D',
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
        color: '#007AFF',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    likeDate: {
        fontSize: 12,
        color: '#6C757D',
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
