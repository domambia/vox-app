import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceCommandButton } from './VoiceCommandButton';
import { VoiceCommandInput } from './VoiceCommandInput';
import { voiceCommandService } from '../../services/voice/voiceCommandService';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

/**
 * Voice Command Overlay Component
 * Floating button for voice commands that appears on all screens
 */
export const VoiceCommandOverlay: React.FC = () => {
    const [isListening, setIsListening] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showInput, setShowInput] = useState(false);
    const [isNativeAvailable, setIsNativeAvailable] = useState(false);

    useEffect(() => {
        // Check if native voice is available
        setIsNativeAvailable(voiceCommandService.isNativeVoiceAvailable());

        // Check initial state
        setIsListening(voiceCommandService.getIsListening());

        // Subscribe to state changes
        const checkInterval = setInterval(() => {
            setIsListening(voiceCommandService.getIsListening());
        }, 500);

        return () => clearInterval(checkInterval);
    }, []);

    const handleToggle = async () => {
        if (isNativeAvailable) {
            // Use native voice recognition
            if (isListening) {
                await voiceCommandService.stopListening();
                setIsListening(false);
            } else {
                const started = await voiceCommandService.startListening();
                setIsListening(started);
            }
        } else {
            // Show manual input modal for Expo Go
            setShowInput(!showInput);
        }
    };

    const handleToggleHelp = async () => {
        const newShowHelp = !showHelp;
        setShowHelp(newShowHelp);
        if (newShowHelp) {
            await voiceCommandService.showAvailableCommands();
        }
    };

    return (
        <>
            <View style={styles.container} pointerEvents="box-none">
                <View style={styles.buttonGroup}>
                    {isNativeAvailable ? (
                        <VoiceCommandButton style={styles.voiceButton} />
                    ) : (
                        <TouchableOpacity
                            onPress={handleToggle}
                            style={[styles.button, showInput && styles.buttonActive, styles.voiceButton]}
                            accessibilityRole="button"
                            accessibilityLabel={showInput ? 'Close command input' : 'Open voice command input'}
                            accessibilityHint="Open manual command input (voice recognition not available in Expo Go)"
                        >
                            <Ionicons
                                name={showInput ? 'mic' : 'mic-outline'}
                                size={24}
                                color={showInput ? '#FFFFFF' : '#007AFF'}
                            />
                        </TouchableOpacity>
                    )}
                    {(isListening || showInput) && (
                        <TouchableOpacity
                            onPress={handleToggleHelp}
                            style={styles.helpButton}
                            accessibilityRole="button"
                            accessibilityLabel="Show voice commands help"
                            accessibilityHint="View available voice commands"
                        >
                            <Ionicons name="help-circle" size={20} color="#007AFF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {!isNativeAvailable && (
                <VoiceCommandInput visible={showInput} onClose={() => setShowInput(false)} />
            )}

            {showHelp && (
                <Modal
                    visible={showHelp}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowHelp(false)}
                    accessibilityViewIsModal={true}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowHelp(false)}
                        accessibilityRole="button"
                        accessibilityLabel="Close help"
                    >
                        <View style={styles.helpModal}>
                            <View style={styles.helpHeader}>
                                <Text style={styles.helpTitle} accessibilityRole="header">
                                    Voice Commands
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowHelp(false)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Close help"
                                >
                                    <Ionicons name="close" size={24} color="#000000" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.helpContent}>
                                {voiceCommandService.getAvailableCommands().map((cmd) => (
                                    <View key={cmd.id} style={styles.commandItem}>
                                        <Text style={styles.commandKeyword}>
                                            "{cmd.keywords[0]}"
                                        </Text>
                                        <Text style={styles.commandDescription}>
                                            {cmd.description}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100,
        right: 16,
        zIndex: 1000,
    },
    buttonGroup: {
        alignItems: 'flex-end',
        gap: 12,
    },
    voiceButton: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    button: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F0F8FF',
        borderWidth: 2,
        borderColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    helpButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    helpModal: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        maxWidth: 400,
        width: '100%',
        maxHeight: '80%',
    },
    helpHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    helpTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000000',
    },
    helpContent: {
        gap: 16,
    },
    commandItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    commandKeyword: {
        fontSize: 18,
        fontWeight: '600',
        color: '#007AFF',
        marginBottom: 4,
    },
    commandDescription: {
        fontSize: 14,
        color: '#6C757D',
    },
});

