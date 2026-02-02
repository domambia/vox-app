import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

interface AccessibleSearchInputProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    onClear?: () => void;
    accessibilityLabel?: string;
    accessibilityHint?: string;
}

/**
 * Accessible Search Input Component
 * Provides search functionality with proper accessibility
 */
export const AccessibleSearchInput: React.FC<AccessibleSearchInputProps> = ({
    value,
    onChangeText,
    placeholder = 'Search...',
    onClear,
    accessibilityLabel = 'Search input',
    accessibilityHint = 'Type to search',
}) => {
    const handleClear = () => {
        onChangeText('');
        if (onClear) {
            onClear();
        }
        announceToScreenReader('Search cleared');
    };

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <Ionicons name="search" size={20} color={AppColors.placeholder} style={styles.searchIcon} />
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#6C757D"
                    accessibilityLabel={accessibilityLabel}
                    accessibilityHint={accessibilityHint}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {value.length > 0 && (
                    <TouchableOpacity
                        onPress={handleClear}
                        style={styles.clearButton}
                        accessibilityRole="button"
                        accessibilityLabel="Clear search"
                        accessibilityHint="Clear the search text"
                    >
                        <Ionicons name="close-circle" size={20} color={AppColors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: AppColors.inputBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.inputBorder,
        paddingHorizontal: 12,
        minHeight: 44,
    },
    searchIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: AppColors.text,
        paddingVertical: 8,
    },
    clearButton: {
        marginLeft: 8,
        padding: 4,
    },
});

