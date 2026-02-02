import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { hapticService } from '../../services/accessibility/hapticService';
import { voiceCallService, CallStatus } from '../../services/api/voiceCallService';
import type { RootStackParamList } from '../../navigation/types';

type CallScreenRouteProp = RouteProp<RootStackParamList, 'Call'>;

/**
 * Voice call screen - initiate/display call and end call.
 * Wired to /api/v1/calls (initiate, status, end).
 */
export const CallScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<CallScreenRouteProp>();
  const { callId: initialCallId, receiverId, receiverName, direction = 'outgoing' } = route.params;

  const [callId, setCallId] = useState<string | undefined>(initialCallId);
  const [status, setStatus] = useState<CallStatus>('INITIATED');
  const [loading, setLoading] = useState(!initialCallId && direction === 'outgoing');
  const [error, setError] = useState<string | null>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    if (initialCallId) {
      setCallId(initialCallId);
      setLoading(false);
      return;
    }
    if (direction !== 'outgoing' || !receiverId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const call = await voiceCallService.initiateCall({ receiverId });
        if (cancelled || endedRef.current) return;
        setCallId(call.callId);
        setStatus(call.status);
        announceToScreenReader(`Calling ${receiverName}`);
      } catch (e: any) {
        if (!cancelled && !endedRef.current) {
          setError(e.message || 'Failed to start call');
          announceToScreenReader('Could not start call.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [initialCallId, direction, receiverId, receiverName]);

  useEffect(() => {
    const t = setTimeout(() => {
      announceToScreenReader(`Voice call with ${receiverName}. ${status}.`);
    }, 600);
    return () => clearTimeout(t);
  }, [receiverName, status]);

  const handleEndCall = async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    hapticService.light();
    if (callId) {
      try {
        await voiceCallService.endCall(callId);
      } catch (_) { }
    }
    announceToScreenReader('Call ended');
    navigation.goBack();
  };

  const statusLabel =
    status === 'RINGING' ? 'Ringing…' :
      status === 'ANSWERED' ? 'Connected' :
        status === 'ENDED' || status === 'REJECTED' || status === 'MISSED' || status === 'CANCELLED' ? 'Ended' :
          'Calling…';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.primary} />
          <Text style={styles.statusText}>Starting call…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={64} color={AppColors.primary} />
        </View>
        <Text style={styles.name} accessibilityRole="header">
          {receiverName}
        </Text>
        <Text style={styles.statusText} accessibilityLiveRegion="polite">
          {error ?? statusLabel}
        </Text>
      </View>
      <View style={styles.actions}>
        <AccessibleButton
          title="End call"
          onPress={handleEndCall}
          variant="primary"
          style={error ? styles.endButton : styles.endButton}
          accessibilityLabel="End call"
          accessibilityHint="Double tap to end the call"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: AppColors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: AppColors.textSecondary,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  endButton: {
    backgroundColor: AppColors.error,
  },
});
