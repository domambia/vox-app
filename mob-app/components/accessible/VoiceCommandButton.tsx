import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { voiceCommandService } from '../../services/voice/voiceCommandService';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { hapticService } from '../../services/accessibility/hapticService';

interface VoiceCommandButtonProps {
    style?: any;
}

/**
 * Voice Command Button Component
 * Toggle button for enabling/disabling voice commands
 */
export const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({ style }) => {
    const [isListening, setIsListening] = useState(false);

    useEffect(() => {
        // Check initial state
        setIsListening(voiceCommandService.getIsListening());

        // Subscribe to state changes
        const checkInterval = setInterval(() => {
            setIsListening(voiceCommandService.getIsListening());
        }, 500);

        return () => clearInterval(checkInterval);
    }, []);

    const handleToggle = async () => {
        if (isListening) {
            await voiceCommandService.stopListening();
            setIsListening(false);
        } else {
            const started = await voiceCommandService.startListening();
            setIsListening(started);
        }
    };

    return (
        <TouchableOpacity
            onPress={handleToggle}
            style={[styles.button, isListening && styles.buttonActive, style]}
            accessibilityRole="button"
            accessibilityLabel={isListening ? 'Voice commands enabled. Tap to disable' : 'Voice commands disabled. Tap to enable'}
            accessibilityHint="Toggle voice command recognition"
            accessibilityState={{ selected: isListening }}
        >
            <Ionicons
                name={isListening ? 'mic' : 'mic-outline'}
                size={24}
                color={isListening ? '#FFFFFF' : '#007AFF'}
            />
            {isListening && (
                <View style={styles.indicator}>
                    <View style={styles.pulse} />
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F0F8FF',
        borderWidth: 2,
        borderColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    buttonActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    indicator: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulse: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#007AFF',
        opacity: 0.3,
    },
});

