import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Ionicons } from '@expo/vector-icons';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { AccessibleInput } from '../../components/accessible/AccessibleInput';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

type MainTabParamList = {
    Groups: undefined;
    CreateGroup: undefined;
};

type CreateGroupScreenNavigationProp = NativeStackNavigationProp<MainTabParamList, 'CreateGroup'>;

interface CreateGroupFormData {
    name: string;
    description: string;
    category: string;
    isPublic: boolean;
}

// Validation schema
const createGroupSchema = yup.object().shape({
    name: yup
        .string()
        .required('Group name is required')
        .min(3, 'Group name must be at least 3 characters')
        .max(50, 'Group name must be less than 50 characters'),
    description: yup
        .string()
        .required('Description is required')
        .min(10, 'Description must be at least 10 characters')
        .max(200, 'Description must be less than 200 characters'),
    category: yup
        .string()
        .required('Please select a category'),
    isPublic: yup
        .boolean()
        .required(),
});

// Available categories
const categories = [
    'General',
    'Technology',
    'Music',
    'Gaming',
    'Sports',
    'Travel',
    'Food & Cooking',
    'Health & Wellness',
    'Education',
    'Arts & Culture',
    'Business',
    'Science',
    'Pets & Animals',
    'Photography',
    'Writing',
];

/**
 * Create Group Screen - WhatsApp-style group creation
 * Voice-first design for accessible group creation
 */
export const CreateGroupScreen: React.FC = () => {
    const navigation = useNavigation<CreateGroupScreenNavigationProp>();
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid, isSubmitting },
        setValue,
        watch,
        setError,
        clearErrors,
    } = useForm<CreateGroupFormData>({
        resolver: yupResolver(createGroupSchema),
        mode: 'onChange',
        defaultValues: {
            name: '',
            description: '',
            category: '',
            isPublic: true,
        },
    });

    const selectedCategory = watch('category');
    const isPublic = watch('isPublic');

    // Announce screen on load
    useEffect(() => {
        const announceScreen = async () => {
            setTimeout(async () => {
                await announceToScreenReader(
                    'Create new group screen. Fill in group details to create your community.'
                );
            }, 500);
        };

        announceScreen();
    }, []);

    const handleValidationError = async (fieldName: string, errorMessage: string) => {
        await announceToScreenReader(`${fieldName}: ${errorMessage}`, { isAlert: true });
    };

    const handleCategorySelect = (category: string) => {
        setValue('category', category);
        setShowCategoryPicker(false);
        announceToScreenReader(`Selected category: ${category}`);
    };

    const handlePrivacyToggle = () => {
        const newValue = !isPublic;
        setValue('isPublic', newValue);
        announceToScreenReader(newValue ? 'Group set to public' : 'Group set to private');
    };

    const onSubmit = async (data: CreateGroupFormData) => {
        try {
            clearErrors();
            await announceToScreenReader('Creating group. Please wait.');

            // TODO: Call create group API
            console.log('Creating group:', data);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            await announceToScreenReader('Group created successfully!', { isAlert: true });

            // Navigate back to groups screen
            setTimeout(() => {
                navigation.goBack();
                // TODO: Navigate to the newly created group detail
            }, 1000);

        } catch (error) {
            const errorMessage = 'Failed to create group. Please try again.';
            await announceToScreenReader(errorMessage, { isAlert: true });
            setError('root', { message: errorMessage });
        }
    };

    const handleBack = () => {
        announceToScreenReader('Going back to groups');
        navigation.goBack();
    };

    const renderCategoryPicker = () => {
        if (!showCategoryPicker) return null;

        return (
            <View style={styles.categoryPicker}>
                <Text style={styles.pickerTitle} accessibilityRole="header">
                    Select Category
                </Text>
                <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
                    {categories.map((category) => (
                        <TouchableOpacity
                            key={category}
                            style={styles.categoryOption}
                            onPress={() => handleCategorySelect(category)}
                            accessibilityRole="button"
                            accessibilityLabel={`Select ${category} category`}
                            accessibilityState={{ selected: selectedCategory === category }}
                        >
                            <Text style={[
                                styles.categoryOptionText,
                                selectedCategory === category && styles.selectedCategoryText
                            ]}>
                                {category}
                            </Text>
                            {selectedCategory === category && (
                                <Ionicons name="checkmark" size={20} color="#007AFF" />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <AccessibleButton
                    title="Cancel"
                    onPress={() => setShowCategoryPicker(false)}
                    variant="outline"
                    style={styles.cancelButton}
                    textStyle={styles.cancelButtonText}
                    accessibilityHint="Cancel category selection"
                />
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <AccessibleButton
                    title="Cancel"
                    onPress={handleBack}
                    variant="outline"
                    size="small"
                    accessibilityHint="Cancel group creation and return to groups"
                    style={styles.cancelHeaderButton}
                    textStyle={styles.cancelHeaderButtonText}
                />
                <Text style={styles.headerTitle} accessibilityRole="header">
                    New Group
                </Text>
                <AccessibleButton
                    title="Create"
                    onPress={handleSubmit(onSubmit)}
                    disabled={!isValid}
                    loading={isSubmitting}
                    variant="primary"
                    size="small"
                    accessibilityHint="Create the new group"
                    style={styles.createHeaderButton}
                    textStyle={styles.createHeaderButtonText}
                />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.form}>
                        <Controller
                            control={control}
                            name="name"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <AccessibleInput
                                    label="Group Name"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.name?.message}
                                    onValidationError={handleValidationError}
                                    maxLength={50}
                                    autoCapitalize="words"
                                    accessibilityHint="Enter a name for your group"
                                    placeholder="Enter group name"
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="description"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <AccessibleInput
                                    label="Description"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.description?.message}
                                    onValidationError={handleValidationError}
                                    multiline
                                    maxLength={200}
                                    numberOfLines={3}
                                    accessibilityHint="Describe what your group is about"
                                    placeholder="Describe your group..."
                                    style={styles.descriptionInput}
                                />
                            )}
                        />

                        <View style={styles.categorySection}>
                            <Text style={styles.sectionLabel} accessibilityRole="text">
                                Category
                            </Text>
                            <TouchableOpacity
                                style={styles.categorySelector}
                                onPress={() => setShowCategoryPicker(true)}
                                accessibilityRole="button"
                                accessibilityLabel={`Category: ${selectedCategory || 'Select category'}`}
                                accessibilityHint="Open category selection menu"
                            >
                                <Text style={[
                                    styles.categorySelectorText,
                                    !selectedCategory && styles.placeholderText
                                ]}>
                                    {selectedCategory || 'Select a category'}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color="#6C757D" />
                            </TouchableOpacity>
                            {errors.category?.message && (
                                <Text style={styles.errorText} accessibilityRole="alert">
                                    {errors.category.message}
                                </Text>
                            )}
                        </View>

                        <View style={styles.privacySection}>
                            <Text style={styles.sectionLabel} accessibilityRole="text">
                                Privacy
                            </Text>
                            <View style={styles.privacyOptions}>
                                <TouchableOpacity
                                    style={[styles.privacyOption, isPublic && styles.selectedPrivacyOption]}
                                    onPress={handlePrivacyToggle}
                                    accessibilityRole="radio"
                                    accessibilityLabel="Public group"
                                    accessibilityState={{ checked: isPublic }}
                                    accessibilityHint="Anyone can find and join this group"
                                >
                                    <View style={styles.radioButton}>
                                        {isPublic && <View style={styles.radioSelected} />}
                                    </View>
                                    <View style={styles.privacyContent}>
                                        <Text style={styles.privacyTitle}>Public</Text>
                                        <Text style={styles.privacyDescription}>
                                            Anyone can find and join this group
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.privacyOption, !isPublic && styles.selectedPrivacyOption]}
                                    onPress={handlePrivacyToggle}
                                    accessibilityRole="radio"
                                    accessibilityLabel="Private group"
                                    accessibilityState={{ checked: !isPublic }}
                                    accessibilityHint="Only invited members can join this group"
                                >
                                    <View style={styles.radioButton}>
                                        {!isPublic && <View style={styles.radioSelected} />}
                                    </View>
                                    <View style={styles.privacyContent}>
                                        <Text style={styles.privacyTitle}>Private</Text>
                                        <Text style={styles.privacyDescription}>
                                            Only invited members can join this group
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {errors.root?.message && (
                            <Text style={styles.errorText} accessibilityRole="alert">
                                {errors.root.message}
                            </Text>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {renderCategoryPicker()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    cancelHeaderButton: {
        minWidth: 60,
    },
    cancelHeaderButtonText: {
        fontSize: 14,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
    },
    createHeaderButton: {
        minWidth: 60,
    },
    createHeaderButtonText: {
        fontSize: 14,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContainer: {
        padding: 16,
    },
    form: {
        gap: 24,
    },
    descriptionInput: {
        minHeight: 80,
    },
    categorySection: {
        gap: 8,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
    },
    categorySelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 8,
        backgroundColor: '#F8F9FA',
    },
    categorySelectorText: {
        fontSize: 16,
        color: '#000000',
    },
    placeholderText: {
        color: '#6C757D',
    },
    errorText: {
        fontSize: 14,
        color: '#DC3545',
        marginTop: 4,
    },
    categoryPicker: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 20,
        zIndex: 1000,
    },
    pickerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 20,
    },
    categoryList: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        maxHeight: 300,
        marginBottom: 16,
    },
    categoryOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E5',
    },
    categoryOptionText: {
        fontSize: 16,
        color: '#000000',
    },
    selectedCategoryText: {
        color: '#007AFF',
        fontWeight: '600',
    },
    cancelButton: {
        backgroundColor: '#FFFFFF',
    },
    cancelButtonText: {
        color: '#007AFF',
    },
    privacySection: {
        gap: 12,
    },
    privacyOptions: {
        gap: 8,
    },
    privacyOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
    },
    selectedPrivacyOption: {
        borderColor: '#007AFF',
        backgroundColor: '#E3F2FD',
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#6C757D',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    radioSelected: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#007AFF',
    },
    privacyContent: {
        flex: 1,
    },
    privacyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 4,
    },
    privacyDescription: {
        fontSize: 14,
        color: '#6C757D',
        lineHeight: 18,
    },
});
