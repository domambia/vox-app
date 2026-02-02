import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { VoiceBioPlayer } from '../../components/accessible/VoiceBioPlayer';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { profileService, Profile as ApiProfile } from '../../services/api/profileService';
import { discoveryService } from '../../services/api/discoveryService';

type ProfileDetailScreenNavigationProp = NativeStackNavigationProp<import('../../navigation/MainNavigator').DiscoverStackParamList, 'ProfileDetail'>;
type ProfileDetailScreenRouteProp = RouteProp<import('../../navigation/MainNavigator').DiscoverStackParamList, 'ProfileDetail'>;

interface Profile {
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
    isMatched: boolean;
}

function mapApiProfileToScreen(api: ApiProfile, isLiked: boolean, isMatched: boolean): Profile {
    const first = api.firstName ?? api.displayName?.split(' ')[0] ?? '';
    const last = api.lastName ?? (api.displayName ? api.displayName.split(' ').slice(1).join(' ') : '');
    const looking = (api.lookingFor ?? 'ALL').toLowerCase() as Profile['lookingFor'];
    return {
        userId: api.userId,
        firstName: first,
        lastName: last,
        bio: api.bio,
        interests: Array.isArray(api.interests) ? api.interests : [],
        location: api.location,
        lookingFor: looking === 'all' ? 'all' : looking,
        voiceBioUrl: api.voiceBioUrl,
        isLiked,
        isMatched,
    };
}

/**
 * Profile Detail Screen - Full profile view from discovery (real API)
 * Voice-first design for accessible profile viewing
 */
export const ProfileDetailScreen: React.FC = () => {
    const navigation = useNavigation<ProfileDetailScreenNavigationProp>();
    const route = useRoute<ProfileDetailScreenRouteProp>();
    const { userId } = route.params;

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [likeLoading, setLikeLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!userId) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const [apiProfile, likesRes, matchesRes] = await Promise.all([
                    profileService.getProfile(userId),
                    discoveryService.getLikes({ type: 'given', limit: 100 }),
                    discoveryService.getMatches({ limit: 100 }),
                ]);
                if (cancelled) return;
                const givenLikes = likesRes?.data ?? [];
                const matches = matchesRes?.data ?? matchesRes?.matches ?? [];
                const likedUserIds = new Set(
                    givenLikes.map((l: any) => l.liked_id ?? l.likedId ?? l.userId ?? l.profile?.user_id)
                );
                const matchedUserIds = new Set(
                    matches.map((m: any) => {
                        const u = m.other_user ?? m.user ?? m;
                        return u.user_id ?? u.userId;
                    })
                );
                const isLiked = likedUserIds.has(userId);
                const isMatched = matchedUserIds.has(userId);
                setProfile(mapApiProfileToScreen(apiProfile, isLiked, isMatched));
            } catch {
                if (!cancelled) setProfile(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [userId]);

    useEffect(() => {
        if (!profile) return;
        const t = setTimeout(() => {
            announceToScreenReader(
                `Profile detail: ${profile.firstName} ${profile.lastName}. ${profile.bio ? 'Has bio' : 'No bio'}. ${profile.interests.length} interests. ${profile.matchScore ? `${profile.matchScore}% match` : ''}`
            );
        }, 500);
        return () => clearTimeout(t);
    }, [profile]);

    const handleLike = async () => {
        if (!profile || profile.isLiked || likeLoading) return;
        setLikeLoading(true);
        try {
            const result = await profileService.likeProfile(profile.userId);
            setProfile(prev => prev ? { ...prev, isLiked: true, isMatched: prev.isMatched || result.isMatch } : null);
            await announceToScreenReader(`Liked ${profile.firstName} ${profile.lastName}`);
            if (result.isMatch) {
                await announceToScreenReader(`It's a match! You and ${profile.firstName} liked each other!`, { isAlert: true });
            }
        } catch {
            await announceToScreenReader('Failed to like profile', { isAlert: true });
        } finally {
            setLikeLoading(false);
        }
    };

    const handleMessage = async () => {
        if (!profile) return;
        await announceToScreenReader(`Starting conversation with ${profile.firstName}`);
        const rootNavigation = navigation.getParent()?.getParent();
        if (rootNavigation) {
            rootNavigation.dispatch(
                CommonActions.navigate({
                    name: 'Messages',
                    params: {
                        screen: 'Chat',
                        params: {
                            participantId: profile.userId,
                            participantName: `${profile.firstName} ${profile.lastName}`,
                        },
                    },
                })
            );
        }
    };

    const handleCall = () => {
        if (!profile) return;
        const rootNav = (navigation.getParent() as any)?.getParent()?.getParent();
        if (rootNav) {
            rootNav.navigate('Call', {
                receiverId: profile.userId,
                receiverName: `${profile.firstName} ${profile.lastName}`.trim() || 'User',
                direction: 'outgoing' as const,
            });
            announceToScreenReader(`Starting voice call with ${profile.firstName}`);
        }
    };

    const handleBack = () => {
        announceToScreenReader('Going back to discover');
        navigation.goBack();
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <AccessibleButton title="Back" onPress={handleBack} variant="outline" size="small" style={styles.backButton} textStyle={styles.backButtonText} />
                    <Text style={styles.headerTitle}>Profile</Text>
                    <View style={styles.headerPlaceholder} />
                </View>
                <View style={styles.loadingContainer}> 
                    <ActivityIndicator size="large" color={AppColors.primary} />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!profile) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <AccessibleButton title="Back" onPress={handleBack} variant="outline" size="small" style={styles.backButton} textStyle={styles.backButtonText} />
                    <Text style={styles.headerTitle}>Profile</Text>
                    <View style={styles.headerPlaceholder} />
                </View>
                <View style={styles.loadingContainer}>
                    <Text style={styles.emptyTitle}>Profile not found</Text>
                    <Text style={styles.emptyDescription}>This profile may have been removed or is no longer available.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <AccessibleButton
                    title="Back"
                    onPress={handleBack}
                    variant="outline"
                    size="small"
                    accessibilityHint="Return to discover screen"
                    style={styles.backButton}
                    textStyle={styles.backButtonText}
                />
                <Text style={styles.headerTitle} accessibilityRole="header">
                    Profile
                </Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    {/* Avatar */}
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

                    {/* Name and Location */}
                    <View style={styles.nameSection}>
                        <Text style={styles.name} accessibilityRole="text">
                            {profile.firstName} {profile.lastName}
                        </Text>
                        {profile.location && (
                            <Text style={styles.location} accessibilityRole="text">
                                📍 {profile.location}
                                {profile.distance && ` • ${profile.distance} km away`}
                            </Text>
                        )}
                    </View>

                    {/* Bio */}
                    {profile.bio && (
                        <View style={styles.bioSection}>
                            <Text style={styles.sectionTitle} accessibilityRole="header">
                                About
                            </Text>
                            <Text style={styles.bio} accessibilityRole="text">
                                {profile.bio}
                            </Text>
                        </View>
                    )}

                    {/* Voice Bio */}
                    {profile.voiceBioUrl && (
                        <View style={styles.voiceBioSection}>
                            <Text style={styles.sectionTitle} accessibilityRole="header">
                                Voice Introduction
                            </Text>
                            <VoiceBioPlayer
                                existingUri={profile.voiceBioUrl}
                                maxDuration={60000}
                            />
                        </View>
                    )}

                    {/* Looking For */}
                    <View style={styles.lookingForSection}>
                        <Text style={styles.sectionTitle} accessibilityRole="header">
                            Looking For
                        </Text>
                        <View style={styles.lookingForBadge}>
                            <Text style={styles.lookingForText}>
                                {profile.lookingFor === 'all' ? 'Open to All' :
                                    profile.lookingFor === 'dating' ? 'Dating' :
                                        profile.lookingFor === 'friendship' ? 'Friendship' :
                                            'Hobbies & Interests'}
                            </Text>
                        </View>
                    </View>

                    {/* Interests */}
                    <View style={styles.interestsSection}>
                        <Text style={styles.sectionTitle} accessibilityRole="header">
                            Interests
                        </Text>
                        <View style={styles.interestsContainer}>
                            {profile.interests.map((interest, idx) => (
                                <View key={idx} style={styles.interestChip}>
                                    <Text style={styles.interestText}>{interest}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                    {profile.isMatched ? (
                        <>
                            <AccessibleButton
                                title="Send Message"
                                onPress={handleMessage}
                                variant="primary"
                                size="large"
                                accessibilityHint={`Start conversation with ${profile.firstName}`}
                                style={styles.messageButton}
                                textStyle={styles.messageButtonText}
                            />
                            <AccessibleButton
                                title="Voice call"
                                onPress={handleCall}
                                variant="outline"
                                size="large"
                                accessibilityHint={`Start voice call with ${profile.firstName}`}
                                style={styles.messageButton}
                                textStyle={styles.messageButtonText}
                            />
                        </>
                    ) : (
                        <>
                            <AccessibleButton
                                title={profile.isLiked ? "Liked ✓" : "Like"}
                                onPress={handleLike}
                                variant={profile.isLiked ? "secondary" : "primary"}
                                size="large"
                                disabled={profile.isLiked || likeLoading}
                                accessibilityHint={profile.isLiked ? "Already liked" : `Like ${profile.firstName}`}
                                style={styles.likeButton}
                                textStyle={styles.likeButtonText}
                            />
                            {profile.isLiked && (
                                <AccessibleButton
                                    title="Send Message"
                                    onPress={handleMessage}
                                    variant="primary"
                                    size="large"
                                    accessibilityHint={`Start conversation with ${profile.firstName}`}
                                    style={styles.messageButton}
                                    textStyle={styles.messageButtonText}
                                />
                            )}
                        </>
                    )}
                </View>
            </ScrollView>
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
    backButton: {
        minWidth: 60,
    },
    backButtonText: {
        fontSize: 14,
        color: AppColors.text,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: AppColors.text,
    },
    headerPlaceholder: {
        width: 60,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        gap: 12,
    },
    loadingText: {
        fontSize: 16,
        color: AppColors.textSecondary,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: AppColors.text,
        textAlign: 'center',
    },
    emptyDescription: {
        fontSize: 16,
        color: AppColors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
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
        marginBottom: 24,
        shadowColor: AppColors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
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
        color: AppColors.white,
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
        color: AppColors.white,
    },
    nameSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    name: {
        fontSize: 28,
        fontWeight: '700',
        color: AppColors.text,
        marginBottom: 4,
    },
    location: {
        fontSize: 16,
        color: AppColors.textSecondary,
    },
    bioSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: AppColors.text,
        marginBottom: 8,
    },
    bio: {
        fontSize: 16,
        color: AppColors.text,
        lineHeight: 24,
    },
    voiceBioSection: {
        marginBottom: 20,
    },
    voiceBioButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: AppColors.inputBg,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.primary,
    },
    playingButton: {
        backgroundColor: AppColors.borderLight,
    },
    voiceBioText: {
        fontSize: 16,
        color: AppColors.primary,
        marginLeft: 8,
        fontWeight: '500',
    },
    lookingForSection: {
        marginBottom: 20,
    },
    lookingForBadge: {
        backgroundColor: AppColors.borderLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    lookingForText: {
        fontSize: 14,
        color: AppColors.success,
        fontWeight: '600',
    },
    interestsSection: {
        marginBottom: 20,
    },
    interestsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
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
    actions: {
        gap: 12,
    },
    likeButton: {
        backgroundColor: AppColors.success,
    },
    likeButtonText: {
        color: AppColors.white,
    },
    messageButton: {
        backgroundColor: AppColors.primary,
    },
    messageButtonText: {
        color: AppColors.white,
    },
});
