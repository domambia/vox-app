import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { voiceRecordingService, RecordingStatus } from '../../services/audio/voiceRecordingService';
import { voicePlaybackService, PlaybackStatus } from '../../services/audio/voicePlaybackService';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { hapticService } from '../../services/accessibility/hapticService';

interface VoiceBioPlayerProps {
    existingUri?: string;
    onRecordingComplete?: (uri: string) => void;
    onDelete?: () => void;
    maxDuration?: number; // in milliseconds
}

/**
 * Voice Bio Player Component
 * Handles recording and playback of voice bios
 */
export const VoiceBioPlayer: React.FC<VoiceBioPlayerProps> = ({
    existingUri,
    onRecordingComplete,
    onDelete,
    maxDuration = 60000, // 60 seconds default
}) => {
    const [recordingStatus, setRecordingStatus] = useState<RecordingStatus | null>(null);
    const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus | null>(null);
    const [mode, setMode] = useState<'idle' | 'recording' | 'playing' | 'paused'>('idle');

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (mode === 'recording') {
                voiceRecordingService.cancelRecording();
            }
            if (mode === 'playing' || mode === 'paused') {
                voicePlaybackService.stop();
            }
        };
    }, [mode]);

    const handleStartRecording = async () => {
        const started = await voiceRecordingService.startRecording((status) => {
            setRecordingStatus(status);

            // Check max duration
            if (status.duration >= maxDuration) {
                handleStopRecording();
            }
        });

        if (started) {
            setMode('recording');
            setRecordingStatus({ isRecording: true, duration: 0 });
            await hapticService.medium();
        }
    };

    const handleStopRecording = async () => {
        const uri = await voiceRecordingService.stopRecording();
        setMode('idle');
        setRecordingStatus(null);

        if (uri && onRecordingComplete) {
            await hapticService.success();
            onRecordingComplete(uri);
            await announceToScreenReader('Voice bio recorded successfully');
        }
    };

    const handleCancelRecording = async () => {
        await voiceRecordingService.cancelRecording();
        setMode('idle');
        setRecordingStatus(null);
        await hapticService.light();
        await announceToScreenReader('Recording cancelled');
    };

    const handlePlay = async () => {
        if (!existingUri) return;

        const played = await voicePlaybackService.play(existingUri, (status) => {
            setPlaybackStatus(status);
            if (!status.isPlaying && status.position >= status.duration) {
                setMode('idle');
                setPlaybackStatus(null);
            }
        });

        if (played) {
            setMode('playing');
            await hapticService.light();
        }
    };

    const handlePause = async () => {
        await voicePlaybackService.pause();
        setMode('paused');
        await hapticService.light();
    };

    const handleResume = async () => {
        await voicePlaybackService.resume();
        setMode('playing');
        await hapticService.light();
    };

    const handleStop = async () => {
        await voicePlaybackService.stop();
        setMode('idle');
        setPlaybackStatus(null);
        await hapticService.light();
    };

    const handleDelete = async () => {
        await hapticService.warning();
        if (onDelete) {
            onDelete();
            await announceToScreenReader('Voice bio deleted');
        }
    };

    const formatDuration = (milliseconds: number): string => {
        return voiceRecordingService.formatDuration(milliseconds);
    };

    // Recording mode
    if (mode === 'recording') {
        return (
            <View style={styles.container}>
                <View style={styles.recordingContainer}>
                    <View style={styles.recordingIndicator}>
                        <View style={styles.recordingDot} />
                        <Text style={styles.recordingText} accessibilityRole="text">
                            Recording...
                        </Text>
                    </View>
                    <Text style={styles.duration} accessibilityRole="text">
                        {recordingStatus ? formatDuration(recordingStatus.duration) : '0s'}
                    </Text>
                </View>
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        onPress={handleStopRecording}
                        style={[styles.button, styles.stopButton]}
                        accessibilityRole="button"
                        accessibilityLabel="Stop recording"
                        accessibilityHint="Stop recording and save voice bio"
                    >
                        <Ionicons name="stop" size={24} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Stop</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleCancelRecording}
                        style={[styles.button, styles.cancelButton]}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel recording"
                        accessibilityHint="Cancel and discard recording"
                    >
                        <Ionicons name="close" size={24} color="#FF3B30" />
                        <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Playback mode
    if (existingUri && (mode === 'playing' || mode === 'paused')) {
        return (
            <View style={styles.container}>
                <View style={styles.playbackContainer}>
                    <TouchableOpacity
                        onPress={mode === 'playing' ? handlePause : handleResume}
                        style={styles.playButton}
                        accessibilityRole="button"
                        accessibilityLabel={mode === 'playing' ? 'Pause playback' : 'Resume playback'}
                    >
                        <Ionicons name={mode === 'playing' ? 'pause' : 'play'} size={24} color="#007AFF" />
                    </TouchableOpacity>
                    <View style={styles.playbackInfo}>
                        <Text style={styles.playbackText} accessibilityRole="text">
                            {mode === 'playing' ? 'Playing...' : 'Paused'}
                        </Text>
                        {playbackStatus && (
                            <Text style={styles.duration} accessibilityRole="text">
                                {formatDuration(playbackStatus.position)} / {formatDuration(playbackStatus.duration)}
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity
                        onPress={handleStop}
                        style={styles.stopPlaybackButton}
                        accessibilityRole="button"
                        accessibilityLabel="Stop playback"
                    >
                        <Ionicons name="stop" size={20} color="#6C757D" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Idle mode - show controls
    return (
        <View style={styles.container}>
            <View style={styles.buttonRow}>
                {existingUri ? (
                    <>
                        <TouchableOpacity
                            onPress={handlePlay}
                            style={[styles.button, styles.playButton]}
                            accessibilityRole="button"
                            accessibilityLabel="Play voice bio"
                            accessibilityHint="Listen to voice introduction"
                        >
                            <Ionicons name="play" size={24} color="#007AFF" />
                            <Text style={[styles.buttonText, styles.playButtonText]}>Play</Text>
                        </TouchableOpacity>
                        {onDelete && (
                            <TouchableOpacity
                                onPress={handleDelete}
                                style={[styles.button, styles.deleteButton]}
                                accessibilityRole="button"
                                accessibilityLabel="Delete voice bio"
                                accessibilityHint="Remove voice introduction"
                            >
                                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                                <Text style={[styles.buttonText, styles.deleteButtonText]}>Delete</Text>
                            </TouchableOpacity>
                        )}
                    </>
                ) : (
                    <TouchableOpacity
                        onPress={handleStartRecording}
                        style={[styles.button, styles.recordButton]}
                        accessibilityRole="button"
                        accessibilityLabel="Record voice bio"
                        accessibilityHint="Record a voice introduction for your profile"
                    >
                        <Ionicons name="mic" size={24} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Record</Text>
                    </TouchableOpacity>
                )}
            </View>
            {existingUri && (
                <Text style={styles.hint} accessibilityRole="text">
                    Tap play to listen to your voice introduction
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    recordingContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    recordingDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FF3B30',
        marginRight: 8,
    },
    recordingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FF3B30',
    },
    duration: {
        fontSize: 14,
        color: '#6C757D',
        marginTop: 4,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        minWidth: 100,
        justifyContent: 'center',
    },
    stopButton: {
        backgroundColor: '#FF3B30',
    },
    cancelButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    recordButton: {
        backgroundColor: '#007AFF',
    },
    playButton: {
        backgroundColor: '#F0F8FF',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    deleteButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 8,
    },
    cancelButtonText: {
        color: '#FF3B30',
    },
    playButtonText: {
        color: '#007AFF',
    },
    deleteButtonText: {
        color: '#FF3B30',
    },
    playbackContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F8FF',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    playbackInfo: {
        flex: 1,
        marginLeft: 12,
    },
    playbackText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#007AFF',
        marginBottom: 4,
    },
    stopPlaybackButton: {
        padding: 8,
    },
    hint: {
        fontSize: 12,
        color: '#6C757D',
        textAlign: 'center',
        marginTop: 8,
    },
});

