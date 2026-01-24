import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Alert,
    Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { VoiceBioPlayer } from '../../components/accessible/VoiceBioPlayer';
import { OfflineBanner } from '../../components/accessible/OfflineBanner';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

type MainTabParamList = {
    Profile: undefined;
    EditProfile: undefined;
    // Add other navigation types as needed
};

type ProfileScreenNavigationProp = NativeStackNavigationProp<MainTabParamList>;

interface Profile {
    userId: string;
    firstName: string;
    lastName: string;
    email?: string;
    bio?: string;
    interests: string[];
    location?: string;
    lookingFor: 'dating' | 'friendship' | 'hobby' | 'all';
    voiceBioUrl?: string;
    createdAt: string;
    isOwnProfile: boolean;
}

// Mock profile data
const mockProfile: Profile = {
    userId: 'me',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    bio: 'Hello! I\'m a software developer who loves hiking and playing guitar. Looking to connect with people who share similar interests.',
    interests: ['Technology', 'Music', 'Hiking', 'Photography', 'Gaming'],
    location: 'Valletta, Malta',
    lookingFor: 'friendship',
    voiceBioUrl: 'mock-url', // Mock voice bio
    createdAt: '2024-01-15T10:00:00Z',
    isOwnProfile: true,
};

/**
 * Profile Screen - User's profile view with accessibility focus
 * Voice-first design for profile management
 */
export const ProfileScreen: React.FC = () => {
    const navigation = useNavigation<ProfileScreenNavigationProp>();
    const [profile, setProfile] = useState<Profile>(mockProfile);
    const [voiceBioUri, setVoiceBioUri] = useState<string | undefined>(profile.voiceBioUrl);

    // Announce screen on load
    useEffect(() => {
        const announceScreen = async () => {
            setTimeout(async () => {
                await announceToScreenReader(
                    `Profile screen. ${profile.firstName} ${profile.lastName}. ${profile.bio ? 'Has bio' : 'No bio'}. ${profile.interests.length} interests.`
                );
            }, 500);
        };

        announceScreen();
    }, [profile]);

    const handleEditProfile = () => {
        announceToScreenReader('Editing profile');
        navigation.navigate('EditProfile' as any);
    };

    const handleVoiceBioRecorded = async (uri: string) => {
        setVoiceBioUri(uri);
        setProfile(prev => ({ ...prev, voiceBioUrl: uri }));
        // TODO: Upload to backend
        await announceToScreenReader('Voice bio saved');
    };

    const handleVoiceBioDelete = async () => {
        setVoiceBioUri(undefined);
        setProfile(prev => ({ ...prev, voiceBioUrl: undefined }));
        // TODO: Delete from backend
    };

    const handleInterestPress = (interest: string) => {
        announceToScreenReader(`Interest: ${interest}`);
    };

    const handleLike = () => {
        announceToScreenReader('Like feature not implemented yet');
        // TODO: Implement like functionality
    };

    const renderInterestChip = (interest: string) => (
        <TouchableOpacity
            key={interest}
            style={styles.interestChip}
            onPress={() => handleInterestPress(interest)}
            accessibilityRole="button"
            accessibilityLabel={`Interest: ${interest}`}
            accessibilityHint="Tap to learn more about this interest"
        >
            <Text style={styles.interestText}>{interest}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <OfflineBanner />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title} accessibilityRole="header">
                        My Profile
                    </Text>
                    <AccessibleButton
                        title="Edit"
                        onPress={handleEditProfile}
                        variant="outline"
                        size="small"
                        accessibilityHint="Edit your profile information"
                        style={styles.editButton}
                        textStyle={styles.editButtonText}
                    />
                </View>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    {/* Avatar */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                            </Text>
                        </View>
                        <View style={styles.nameSection}>
                            <Text style={styles.name} accessibilityRole="text">
                                {profile.firstName} {profile.lastName}
                            </Text>
                            <Text style={styles.location} accessibilityRole="text">
                                📍 {profile.location}
                            </Text>
                        </View>
                    </View>

                    {/* Bio */}
                    {profile.bio && (
                        <View style={styles.bioSection}>
                            <Text style={styles.sectionTitle} accessibilityRole="header">
                                About Me
                            </Text>
                            <Text style={styles.bio} accessibilityRole="text">
                                {profile.bio}
                            </Text>
                        </View>
                    )}

                    {/* Voice Bio */}
                    <View style={styles.voiceBioSection}>
                        <Text style={styles.sectionTitle} accessibilityRole="header">
                            Voice Introduction
                        </Text>
                        <VoiceBioPlayer
                            existingUri={voiceBioUri}
                            onRecordingComplete={handleVoiceBioRecorded}
                            onDelete={handleVoiceBioDelete}
                            maxDuration={60000}
                        />
                    </View>

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
                            {profile.interests.map(renderInterestChip)}
                        </View>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsSection}>
                        <View style={styles.stat}>
                            <Text style={styles.statNumber}>12</Text>
                            <Text style={styles.statLabel}>Matches</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statNumber}>8</Text>
                            <Text style={styles.statLabel}>Groups</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statNumber}>24</Text>
                            <Text style={styles.statLabel}>Events</Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <AccessibleButton
                        title="View My Matches"
                        onPress={() => announceToScreenReader('View matches feature not implemented')}
                        variant="secondary"
                        size="medium"
                        accessibilityHint="View people you've matched with"
                        style={styles.actionButton}
                        textStyle={styles.actionButtonText}
                    />

                    <AccessibleButton
                        title="My Events"
                        onPress={() => announceToScreenReader('View events feature not implemented')}
                        variant="secondary"
                        size="medium"
                        accessibilityHint="View events you're attending"
                        style={styles.actionButton}
                        textStyle={styles.actionButtonText}
                    />
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
    scrollView: {
        flex: 1,
    },
    scrollContainer: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#000000',
    },
    editButton: {
        minWidth: 60,
    },
    editButtonText: {
        fontSize: 14,
    },
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    avatarSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    nameSection: {
        flex: 1,
    },
    name: {
        fontSize: 24,
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
        marginBottom: 4,
    },
    interestText: {
        fontSize: 14,
        color: '#333333',
        fontWeight: '500',
    },
    statsSection: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
    },
    stat: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: '#007AFF',
    },
    statLabel: {
        fontSize: 12,
        color: '#6C757D',
        marginTop: 4,
    },
    actions: {
        gap: 12,
    },
    actionButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    actionButtonText: {
        color: '#007AFF',
    },
});
