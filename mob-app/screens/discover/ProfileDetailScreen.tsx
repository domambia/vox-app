import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

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

// Mock profile data
const mockProfile: Profile = {
    userId: '1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    bio: 'Music enthusiast and accessibility advocate. Love connecting with people who share similar interests. Always up for a good conversation about music, technology, or accessibility features.',
    interests: ['Music', 'Technology', 'Accessibility', 'Gaming', 'Photography', 'Travel'],
    location: 'Valletta, Malta',
    lookingFor: 'friendship',
    voiceBioUrl: 'mock-url',
    matchScore: 85,
    distance: 2.5,
    isLiked: false,
    isMatched: false,
};

/**
 * Profile Detail Screen - Full profile view from discovery
 * Voice-first design for accessible profile viewing
 */
export const ProfileDetailScreen: React.FC = () => {
    const navigation = useNavigation<ProfileDetailScreenNavigationProp>();
    const route = useRoute<ProfileDetailScreenRouteProp>();
    const { userId } = route.params;

    const [profile, setProfile] = useState<Profile>(mockProfile);
    const [isPlayingVoiceBio, setIsPlayingVoiceBio] = useState(false);

    // Announce screen on load
    useEffect(() => {
        const announceScreen = async () => {
            setTimeout(async () => {
                await announceToScreenReader(
                    `Profile detail: ${profile.firstName} ${profile.lastName}. ${profile.bio ? 'Has bio' : 'No bio'}. ${profile.interests.length} interests. ${profile.matchScore ? `${profile.matchScore}% match` : ''}`
                );
            }, 500);
        };

        announceScreen();
    }, [profile]);

    const handleLike = async () => {
        await announceToScreenReader(`Liked ${profile.firstName} ${profile.lastName}`);
        setProfile(prev => ({ ...prev, isLiked: true }));

        // Simulate match check
        if (profile.matchScore && profile.matchScore > 80) {
            setTimeout(() => {
                announceToScreenReader(`It's a match! You and ${profile.firstName} liked each other!`, { isAlert: true });
                setProfile(prev => ({ ...prev, isMatched: true }));
            }, 500);
        }
    };

    const handleMessage = async () => {
        await announceToScreenReader(`Starting conversation with ${profile.firstName}`);
        // Navigate to Messages tab and then to Chat screen
        const rootNavigation = navigation.getParent()?.getParent();
        if (rootNavigation) {
            rootNavigation.dispatch(
                CommonActions.navigate({
                    name: 'Messages',
                    params: {
                        screen: 'Chat',
                        params: {
                            conversationId: profile.userId,
                            participantName: `${profile.firstName} ${profile.lastName}`,
                        },
                    },
                })
            );
        }
    };

    const handlePlayVoiceBio = async () => {
        if (isPlayingVoiceBio) {
            setIsPlayingVoiceBio(false);
            await announceToScreenReader('Voice bio stopped');
        } else {
            setIsPlayingVoiceBio(true);
            await announceToScreenReader('Playing voice bio');
            // Simulate playback
            setTimeout(() => {
                setIsPlayingVoiceBio(false);
                announceToScreenReader('Voice bio finished playing');
            }, 3000);
        }
    };

    const handleBack = () => {
        announceToScreenReader('Going back to discover');
        navigation.goBack();
    };

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
                            <TouchableOpacity
                                style={[styles.voiceBioButton, isPlayingVoiceBio && styles.playingButton]}
                                onPress={handlePlayVoiceBio}
                                accessibilityRole="button"
                                accessibilityLabel={isPlayingVoiceBio ? "Stop voice bio" : "Play voice bio"}
                                accessibilityHint="Listen to voice introduction"
                                accessibilityState={{ selected: isPlayingVoiceBio }}
                            >
                                <Ionicons
                                    name={isPlayingVoiceBio ? "pause" : "play"}
                                    size={20}
                                    color="#007AFF"
                                />
                                <Text style={styles.voiceBioText}>
                                    {isPlayingVoiceBio ? 'Playing...' : 'Listen to voice'}
                                </Text>
                            </TouchableOpacity>
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
                        <AccessibleButton
                            title="Send Message"
                            onPress={handleMessage}
                            variant="primary"
                            size="large"
                            accessibilityHint={`Start conversation with ${profile.firstName}`}
                            style={styles.messageButton}
                            textStyle={styles.messageButtonText}
                        />
                    ) : (
                        <>
                            <AccessibleButton
                                title={profile.isLiked ? "Liked ✓" : "Like"}
                                onPress={handleLike}
                                variant={profile.isLiked ? "secondary" : "primary"}
                                size="large"
                                disabled={profile.isLiked}
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
    backButton: {
        minWidth: 60,
    },
    backButtonText: {
        fontSize: 14,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
    },
    headerPlaceholder: {
        width: 60,
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
        marginBottom: 24,
        shadowColor: '#000000',
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
    nameSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    name: {
        fontSize: 28,
        fontWeight: '700',
        color: '#000000',
        marginBottom: 4,
    },
    location: {
        fontSize: 16,
        color: '#6C757D',
    },
    bioSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 8,
    },
    bio: {
        fontSize: 16,
        color: '#333333',
        lineHeight: 24,
    },
    voiceBioSection: {
        marginBottom: 20,
    },
    voiceBioButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F8FF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    playingButton: {
        backgroundColor: '#E3F2FD',
    },
    voiceBioText: {
        fontSize: 16,
        color: '#007AFF',
        marginLeft: 8,
        fontWeight: '500',
    },
    lookingForSection: {
        marginBottom: 20,
    },
    lookingForBadge: {
        backgroundColor: '#E8F5E8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    lookingForText: {
        fontSize: 14,
        color: '#2E7D32',
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
    actions: {
        gap: 12,
    },
    likeButton: {
        backgroundColor: '#34C759',
    },
    likeButtonText: {
        color: '#FFFFFF',
    },
    messageButton: {
        backgroundColor: '#007AFF',
    },
    messageButtonText: {
        color: '#FFFFFF',
    },
});
