import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { voiceCommandService } from '../../services/voice/voiceCommandService';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { hapticService } from '../../services/accessibility/hapticService';

interface VoiceCommandInputProps {
    visible: boolean;
    onClose: () => void;
}

/**
 * Voice Command Input Component
 * Fallback for Expo Go - allows manual command input
 */
export const VoiceCommandInput: React.FC<VoiceCommandInputProps> = ({ visible, onClose }) => {
    const [command, setCommand] = useState('');

    const handleSubmit = async () => {
        if (!command.trim()) return;

        const result = await voiceCommandService.processManualCommand(command.trim());

        if (result.success) {
            await hapticService.success();
            setCommand('');
            onClose();
        } else {
            await hapticService.error();
            await announceToScreenReader(result.message || 'Command not recognized. Say "help" to see available commands.');
        }
    };

    const handleShowHelp = async () => {
        await voiceCommandService.showAvailableCommands();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            accessibilityViewIsModal={true}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title} accessibilityRole="header">
                            Voice Command
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close command input"
                        >
                            <Ionicons name="close" size={24} color="#000000" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={command}
                            onChangeText={setCommand}
                            placeholder="Type a command (e.g., 'discover', 'like', 'messages')"
                            placeholderTextColor="#999999"
                            autoFocus
                            onSubmitEditing={handleSubmit}
                            accessibilityLabel="Command input"
                            accessibilityHint="Type a voice command and press enter"
                        />
                        <TouchableOpacity
                            onPress={handleSubmit}
                            style={styles.submitButton}
                            accessibilityRole="button"
                            accessibilityLabel="Submit command"
                        >
                            <Ionicons name="send" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.helpContainer}>
                        <TouchableOpacity
                            onPress={handleShowHelp}
                            style={styles.helpButton}
                            accessibilityRole="button"
                            accessibilityLabel="Show available commands"
                        >
                            <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
                            <Text style={styles.helpText}>Show available commands</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.examplesContainer}>
                        <Text style={styles.examplesTitle}>Quick Examples:</Text>
                        {['discover', 'messages', 'like', 'pass', 'filter'].map((cmd) => (
                            <TouchableOpacity
                                key={cmd}
                                onPress={() => {
                                    setCommand(cmd);
                                    handleSubmit();
                                }}
                                style={styles.exampleButton}
                                accessibilityRole="button"
                                accessibilityLabel={`Use command: ${cmd}`}
                            >
                                <Text style={styles.exampleText}>{cmd}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000000',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    input: {
        flex: 1,
        height: 48,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        backgroundColor: '#F5F5F5',
    },
    submitButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    helpContainer: {
        marginBottom: 20,
    },
    helpButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    helpText: {
        fontSize: 16,
        color: '#007AFF',
        marginLeft: 8,
    },
    examplesContainer: {
        marginTop: 20,
    },
    examplesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6C757D',
        marginBottom: 12,
    },
    exampleButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: '#F0F8FF',
        borderRadius: 8,
        marginBottom: 8,
    },
    exampleText: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '500',
    },
});

