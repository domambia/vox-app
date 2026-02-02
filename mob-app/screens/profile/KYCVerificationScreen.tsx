import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { OfflineBanner } from '../../components/accessible/OfflineBanner';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { hapticService } from '../../services/accessibility/hapticService';
import { kycService, KYCStatus, KYCVerification as KYCVerificationType } from '../../services/api/kycService';
import type { ProfileStackParamList } from '../../navigation/MainNavigator';

type KYCVerificationScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'KYCVerification'>;

/**
 * KYC Verification Screen - Identity verification status and flow
 * Wired to /api/v1/kyc (initiate, upload-document, schedule-call, status, history)
 */
export const KYCVerificationScreen: React.FC = () => {
  const navigation = useNavigation<KYCVerificationScreenNavigationProp>();
  const [status, setStatus] = useState<KYCStatus | null>(null);
  const [verification, setVerification] = useState<KYCVerificationType | null>(null);
  const [history, setHistory] = useState<KYCVerificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const [statusRes, historyRes] = await Promise.all([
        kycService.getStatus(),
        kycService.getHistory({ limit: 20 }),
      ]);
      setStatus(statusRes.status);
      setVerification(statusRes.verification ?? null);
      setHistory(historyRes.data ?? []);
    } catch (e: any) {
      setError(e.message || 'Failed to load KYC status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (status) announceToScreenReader(`KYC verification. Status: ${status}.`);
    }, 500);
    return () => clearTimeout(t);
  }, [status]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleBack = () => {
    hapticService.light();
    navigation.goBack();
  };

  const handleInitiate = async () => {
    if (initiating) return;
    setInitiating(true);
    setError(null);
    try {
      await kycService.initiateVerification({ documentType: 'id_card' });
      await announceToScreenReader('Verification started. You can upload a document next.');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to start verification');
      announceToScreenReader('Could not start verification.');
    } finally {
      setInitiating(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (s: KYCStatus) => {
    switch (s) {
      case 'APPROVED': return AppColors.success;
      case 'REJECTED': return AppColors.error;
      default: return AppColors.warning;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.primary} />
          <Text style={styles.loadingText}>Loading verification status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={AppColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Verify identity
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={20} color={AppColors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current status</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status ?? 'PENDING') + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(status ?? 'PENDING') }]} />
            <Text style={[styles.statusText, { color: getStatusColor(status ?? 'PENDING') }]}>
              {status ?? 'PENDING'}
            </Text>
          </View>
          {verification ? (
            <Text style={styles.helper}>
              Method: {verification.method}. {verification.rejectionReason ? `Rejected: ${verification.rejectionReason}` : ''}
              {' '}Created: {formatDate(verification.createdAt)}.
            </Text>
          ) : null}
        </View>

        {status !== 'APPROVED' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Start verification</Text>
            <Text style={styles.description}>
              Submit an ID document or schedule a video call to verify your identity.
            </Text>
            <AccessibleButton
              title={initiating ? 'Starting…' : 'Start verification'}
              onPress={handleInitiate}
              variant="primary"
              loading={initiating}
              accessibilityHint="Start KYC verification"
              style={styles.primaryButton}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>
          {history.length === 0 ? (
            <Text style={styles.helper}>No verification history yet.</Text>
          ) : (
            history.map((v) => (
              <View key={v.verificationId} style={styles.historyRow}>
                <View style={[styles.historyStatus, { backgroundColor: getStatusColor(v.status) + '20' }]}>
                  <Text style={[styles.historyStatusText, { color: getStatusColor(v.status) }]}>{v.status}</Text>
                </View>
                <Text style={styles.historyMeta}>{v.method} · {formatDate(v.createdAt)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, color: AppColors.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: AppColors.text, flex: 1, marginLeft: 8 },
  headerRight: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.errorBgLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 14, color: AppColors.error },
  section: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: AppColors.borderLight },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: AppColors.text, marginBottom: 12 },
  description: { fontSize: 14, color: AppColors.textSecondary, marginBottom: 12, lineHeight: 20 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 16, fontWeight: '600' },
  helper: { fontSize: 14, color: AppColors.textSecondary, marginTop: 8 },
  primaryButton: { marginTop: 8 },
  historyRow: { marginBottom: 12 },
  historyStatus: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 4 },
  historyStatusText: { fontSize: 12, fontWeight: '600' },
  historyMeta: { fontSize: 13, color: AppColors.textSecondary },
});
