import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { VoiceBioPlayer } from '../../components/accessible/VoiceBioPlayer';
import { OfflineBanner } from '../../components/accessible/OfflineBanner';
import { NotificationBadge } from '../../components/accessible/NotificationBadge';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { getMyProfile, uploadVoiceBio, deleteVoiceBio } from '../../store/slices/profileSlice';
import { showToast } from '../../store/slices/toastSlice';
import { groupsService } from '../../services/api/groupsService';
import { eventsService } from '../../services/api/eventsService';
import { discoveryService } from '../../services/api/discoveryService';

type MainTabParamList = {
    Profile: undefined;
    EditProfile: undefined;
};

type ProfileScreenNavigationProp = NativeStackNavigationProp<MainTabParamList>;

/** Display-friendly lookingFor label */
function lookingForLabel(lookingFor?: string): string {
    switch (lookingFor) {
        case 'ALL': return 'Open to All';
        case 'DATING': return 'Dating';
        case 'FRIENDSHIP': return 'Friendship';
        case 'HOBBY': return 'Hobbies & Interests';
        default: return 'Open to All';
    }
}

/**
 * Profile Screen - User's profile view with real data from backend
 * Voice-first design for profile management
 */
export const ProfileScreen: React.FC = () => {
    const navigation = useNavigation<ProfileScreenNavigationProp>();
    const dispatch = useAppDispatch();
    const { currentProfile, isLoading, error } = useAppSelector((state) => state.profile);
    const authUser = useAppSelector((state) => state.auth.user);

    // Merge profile with auth user fallback (name from user when no profile or 404)
    const profile = useMemo(() => {
        const p = currentProfile;
        const firstName = p?.firstName ?? authUser?.firstName ?? '';
        const lastName = p?.lastName ?? authUser?.lastName ?? '';
        const displayName = p?.displayName ?? ([firstName, lastName].filter(Boolean).join(' ') || 'Profile');
        return {
            userId: p?.userId ?? authUser?.userId ?? '',
            firstName,
            lastName,
            displayName,
            bio: p?.bio,
            interests: p?.interests ?? [],
            location: p?.location,
            lookingFor: p?.lookingFor ?? 'ALL',
            voiceBioUrl: p?.voiceBioUrl,
            createdAt: p?.createdAt ?? '',
            isOwnProfile: true,
        };
    }, [currentProfile, authUser]);

    const [voiceBioUri, setVoiceBioUri] = useState<string | undefined>(profile.voiceBioUrl);
    const [stats, setStats] = useState<{ matches: number; groups: number; events: number }>({ matches: 0, groups: 0, events: 0 });
    const [statsLoading, setStatsLoading] = useState(false);
    const [voiceUploading, setVoiceUploading] = useState(false);

    useEffect(() => {
        setVoiceBioUri(profile.voiceBioUrl);
    }, [profile.voiceBioUrl]);

    useEffect(() => {
        dispatch(getMyProfile());
    }, [dispatch]);

    // Fetch real counts for matches, groups, events
    useEffect(() => {
        const userId = profile.userId;
        if (!userId) return;

        let cancelled = false;
        setStatsLoading(true);

        const load = async () => {
            try {
                const [matchesRes, groupsRes, eventsRes] = await Promise.all([
                    discoveryService.getMatches().catch(() => ({ matches: [] })),
                    groupsService.getUserGroups(userId).catch(() => ({ groups: [] })),
                    eventsService.getUserEvents(userId).catch(() => ({ events: [] })),
                ]);
                if (cancelled) return;
                const matchesCount = Array.isArray((matchesRes as any).matches) ? (matchesRes as any).matches.length : 0;
                const groupsCount = Array.isArray(groupsRes.groups) ? groupsRes.groups.length : 0;
                const eventsCount = Array.isArray(eventsRes.events) ? eventsRes.events.length : 0;
                setStats({ matches: matchesCount, groups: groupsCount, events: eventsCount });
            } catch {
                if (!cancelled) setStats({ matches: 0, groups: 0, events: 0 });
            } finally {
                if (!cancelled) setStatsLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [profile.userId]);

    // Announce screen on load
    useEffect(() => {
        if (!profile.displayName && !profile.firstName) return;
        const announceScreen = async () => {
            setTimeout(async () => {
                await announceToScreenReader(
                    `Profile screen. ${profile.displayName || `${profile.firstName} ${profile.lastName}`.trim()}. ${profile.bio ? 'Has bio' : 'No bio'}. ${profile.interests.length} interests.`
                );
            }, 500);
        };
        announceScreen();
    }, [profile.displayName, profile.firstName, profile.lastName, profile.bio, profile.interests.length]);

    const handleEditProfile = () => {
        announceToScreenReader('Editing profile');
        navigation.navigate('EditProfile' as any);
    };

    const handleSettings = () => {
        announceToScreenReader('Opening settings');
        navigation.navigate('Settings' as any);
    };

    const handleVoiceBioRecorded = useCallback(async (uri: string) => {
        setVoiceUploading(true);
        try {
            const formData = new FormData();
            formData.append('voiceBio', {
                uri,
                name: 'voice-bio.m4a',
                type: 'audio/m4a',
            } as any);
            const result = await dispatch(uploadVoiceBio(formData)).unwrap();
            if (result) setVoiceBioUri(result);
            dispatch(showToast({ message: 'Voice bio saved', type: 'success' }));
            await announceToScreenReader('Voice bio saved');
        } catch (e: any) {
            dispatch(showToast({ message: e?.message || 'Failed to upload voice bio', type: 'error' }));
            await announceToScreenReader('Failed to upload voice bio');
        } finally {
            setVoiceUploading(false);
        }
    }, [dispatch]);

    const handleVoiceBioDelete = useCallback(async () => {
        try {
            await dispatch(deleteVoiceBio()).unwrap();
            setVoiceBioUri(undefined);
            dispatch(showToast({ message: 'Voice bio removed', type: 'success' }));
            await announceToScreenReader('Voice bio removed');
        } catch (e: any) {
            dispatch(showToast({ message: e?.message || 'Failed to remove voice bio', type: 'error' }));
        }
    }, [dispatch]);

    const handleInterestPress = (interest: string) => {
        announceToScreenReader(`Interest: ${interest}`);
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

    if (isLoading && !currentProfile && !authUser) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={AppColors.primary} />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const initials = [profile.firstName?.charAt(0), profile.lastName?.charAt(0)].filter(Boolean).join('').toUpperCase() || '?';
    const nameDisplay = profile.displayName || [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'My Profile';

    return (
        <SafeAreaView style={styles.container}>
            <OfflineBanner />
            {error ? (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText} accessibilityRole="alert">
                        {error}
                    </Text>
                </View>
            ) : null}
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
                    <View style={styles.headerButtons}>
                        <NotificationBadge />
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={handleSettings}
                            accessibilityRole="button"
                            accessibilityLabel="Settings"
                            accessibilityHint="Open app settings and preferences"
                        >
                            <Ionicons name="settings-outline" size={24} color={AppColors.primary} />
                        </TouchableOpacity>
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
                </View>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    {/* Avatar */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {initials}
                            </Text>
                        </View>
                        <View style={styles.nameSection}>
                            <Text style={styles.name} accessibilityRole="text">
                                {nameDisplay}
                            </Text>
                            {profile.location ? (
                                <Text style={styles.location} accessibilityRole="text">
                                    📍 {profile.location}
                                </Text>
                            ) : null}
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
                                {lookingForLabel(profile.lookingFor)}
                            </Text>
                        </View>
                    </View>

                    {/* Interests */}
                    {profile.interests.length > 0 ? (
                        <View style={styles.interestsSection}>
                            <Text style={styles.sectionTitle} accessibilityRole="header">
                                Interests
                            </Text>
                            <View style={styles.interestsContainer}>
                                {profile.interests.map(renderInterestChip)}
                            </View>
                        </View>
                    ) : null}

                    {/* Stats (real data) */}
                    <View style={styles.statsSection}>
                        <View style={styles.stat}>
                            {statsLoading ? (
                                <ActivityIndicator size="small" color={AppColors.primary} />
                            ) : (
                                <Text style={styles.statNumber}>{stats.matches}</Text>
                            )}
                            <Text style={styles.statLabel}>Matches</Text>
                        </View>
                        <View style={styles.stat}>
                            {statsLoading ? (
                                <ActivityIndicator size="small" color={AppColors.primary} />
                            ) : (
                                <Text style={styles.statNumber}>{stats.groups}</Text>
                            )}
                            <Text style={styles.statLabel}>Groups</Text>
                        </View>
                        <View style={styles.stat}>
                            {statsLoading ? (
                                <ActivityIndicator size="small" color={AppColors.primary} />
                            ) : (
                                <Text style={styles.statNumber}>{stats.events}</Text>
                            )}
                            <Text style={styles.statLabel}>Events</Text>
                        </View>
                    </View>
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
    errorBanner: {
        backgroundColor: AppColors.errorBgLight,
        padding: 12,
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 8,
    },
    errorText: {
        fontSize: 14,
        color: AppColors.error,
        textAlign: 'center',
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
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        padding: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: AppColors.text,
    },
    editButton: {
        minWidth: 60,
    },
    editButtonText: {
        fontSize: 14,
    },
    profileCard: {
        backgroundColor: AppColors.background,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: AppColors.text,
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
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 28,
        fontWeight: '700',
        color: AppColors.background,
    },
    nameSection: {
        flex: 1,
    },
    name: {
        fontSize: 24,
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
        marginBottom: 4,
    },
    interestText: {
        fontSize: 14,
        color: AppColors.text,
        fontWeight: '500',
    },
    statsSection: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: AppColors.border,
    },
    stat: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: AppColors.primary,
    },
    statLabel: {
        fontSize: 12,
        color: AppColors.textSecondary,
        marginTop: 4,
    },
    actions: {
        gap: 12,
    },
    actionButton: {
        backgroundColor: AppColors.background,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    actionButtonText: {
        color: AppColors.primary,
    },
});
