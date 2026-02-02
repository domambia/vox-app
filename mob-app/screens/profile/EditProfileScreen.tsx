import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { updateProfile, getMyProfile } from '../../store/slices/profileSlice';
import { showToast } from '../../store/slices/toastSlice';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';

type ProfileStackParamList = {
    ProfileMain: undefined;
    EditProfile: undefined;
    Settings: undefined;
};

type EditProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

const LOOKING_FOR_OPTIONS: { value: 'DATING' | 'FRIENDSHIP' | 'HOBBY' | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Open to All' },
    { value: 'DATING', label: 'Dating' },
    { value: 'FRIENDSHIP', label: 'Friendship' },
    { value: 'HOBBY', label: 'Hobbies & Interests' },
];

export const EditProfileScreen: React.FC = () => {
    const navigation = useNavigation<EditProfileScreenNavigationProp>();
    const dispatch = useAppDispatch();
    const { currentProfile } = useAppSelector((state) => state.profile);
    const authUser = useAppSelector((state) => state.auth.user);

    const userId = currentProfile?.userId ?? authUser?.userId ?? '';

    useEffect(() => {
        if (!currentProfile && authUser?.userId) {
            dispatch(getMyProfile());
        }
    }, [dispatch, currentProfile, authUser?.userId]);

    const [bio, setBio] = useState('');
    const [location, setLocation] = useState('');
    const [interestsStr, setInterestsStr] = useState('');
    const [lookingFor, setLookingFor] = useState<'DATING' | 'FRIENDSHIP' | 'HOBBY' | 'ALL'>('ALL');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (currentProfile) {
            setBio(currentProfile.bio ?? '');
            setLocation(currentProfile.location ?? '');
            setInterestsStr(Array.isArray(currentProfile.interests) ? currentProfile.interests.join(', ') : '');
            setLookingFor(currentProfile.lookingFor ?? 'ALL');
        }
    }, [currentProfile]);

    const handleSave = async () => {
        if (!userId) {
            dispatch(showToast({ message: 'Cannot save: user not loaded', type: 'error' }));
            return;
        }
        setSaving(true);
        try {
            const interests = interestsStr
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 20);
            await dispatch(
                updateProfile({
                    userId,
                    data: { bio: bio || undefined, location: location || undefined, interests, lookingFor },
                })
            ).unwrap();
            dispatch(getMyProfile());
            dispatch(showToast({ message: 'Profile updated', type: 'success' }));
            navigation.goBack();
        } catch (e: any) {
            dispatch(showToast({ message: e?.message || 'Failed to update profile', type: 'error' }));
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Ionicons name="arrow-back" size={24} color="#007AFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <View style={styles.headerRight} />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.field}>
                        <Text style={styles.label}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.bioInput]}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Tell others about yourself"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            maxLength={500}
                            accessibilityLabel="Bio"
                        />
                        <Text style={styles.hint}>{bio.length}/500</Text>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Location</Text>
                        <TextInput
                            style={styles.input}
                            value={location}
                            onChangeText={setLocation}
                            placeholder="City or region"
                            placeholderTextColor="#9CA3AF"
                            maxLength={255}
                            accessibilityLabel="Location"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Interests (comma-separated, max 20)</Text>
                        <TextInput
                            style={[styles.input, styles.bioInput]}
                            value={interestsStr}
                            onChangeText={setInterestsStr}
                            placeholder="e.g. Music, Travel, Cooking"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            accessibilityLabel="Interests"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Looking For</Text>
                        <View style={styles.optionsRow}>
                            {LOOKING_FOR_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[styles.optionChip, lookingFor === opt.value && styles.optionChipActive]}
                                    onPress={() => setLookingFor(opt.value)}
                                    accessibilityRole="button"
                                    accessibilityLabel={opt.label}
                                    accessibilityState={{ selected: lookingFor === opt.value }}
                                >
                                    <Text style={[styles.optionText, lookingFor === opt.value && styles.optionTextActive]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <AccessibleButton
                        title={saving ? 'Saving...' : 'Save changes'}
                        onPress={handleSave}
                        disabled={saving}
                        style={styles.saveButton}
                        textStyle={styles.saveButtonText}
                    />
                    {saving && (
                        <View style={styles.loader}>
                            <ActivityIndicator size="small" color="#007AFF" />
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    headerRight: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    field: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
    },
    bioInput: {
        minHeight: 88,
        textAlignVertical: 'top',
    },
    hint: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    optionChipActive: {
        backgroundColor: '#DBEAFE',
        borderColor: '#007AFF',
    },
    optionText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    optionTextActive: {
        color: '#007AFF',
    },
    saveButton: {
        marginTop: 8,
        backgroundColor: '#007AFF',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    loader: {
        marginTop: 12,
        alignItems: 'center',
    },
});
