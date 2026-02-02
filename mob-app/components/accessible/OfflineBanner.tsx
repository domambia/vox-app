import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { offlineService } from '../../services/network/offlineService';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

/**
 * Offline Banner Component
 * Displays offline status and sync information
 */
export const OfflineBanner: React.FC = () => {
    const [isOnline, setIsOnline] = useState(true);
    const [syncStatus, setSyncStatus] = useState({ queued: 0, syncing: false });

    useEffect(() => {
        // Subscribe to network state changes
        const unsubscribe = offlineService.subscribe((online) => {
            setIsOnline(online);
        });

        // Get initial sync status
        offlineService.getSyncStatus().then(setSyncStatus);

        // Update sync status periodically
        const interval = setInterval(async () => {
            const status = await offlineService.getSyncStatus();
            setSyncStatus(status);
        }, 2000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    if (isOnline && syncStatus.queued === 0) {
        return null; // Don't show banner when online and nothing to sync
    }

    return (
        <View
            style={[styles.banner, !isOnline && styles.offlineBanner]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
        >
            <Ionicons
                name={isOnline ? 'cloud-upload-outline' : 'cloud-offline-outline'}
                size={20}
                color={isOnline ? AppColors.primary : AppColors.error}
            />
            <Text style={[styles.text, !isOnline && styles.offlineText]}>
                {!isOnline
                    ? 'You are offline. Some features may not work.'
                    : syncStatus.syncing
                        ? `Syncing ${syncStatus.queued} queued actions...`
                        : `${syncStatus.queued} action${syncStatus.queued !== 1 ? 's' : ''} queued for sync`}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: AppColors.background,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: AppColors.border,
    },
    offlineBanner: {
        backgroundColor: AppColors.errorBgLight,
        borderBottomColor: AppColors.error,
    },
    text: {
        fontSize: 14,
        color: AppColors.primary,
        marginLeft: 8,
        flex: 1,
    },
    offlineText: {
        color: AppColors.error,
    },
});

