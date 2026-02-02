import { apiClient } from './apiClient';
import { AxiosResponse } from 'axios';

export type KYCStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type KYCMethod = 'DOCUMENT' | 'VIDEO_CALL' | 'REFERRAL';

export interface KYCVerification {
  verificationId: string;
  userId: string;
  method: KYCMethod;
  documentType?: string;
  documentUrl?: string;
  status: KYCStatus;
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface InitiateKYCData {
  documentType: string; // e.g. passport, id_card, driver_license
  country?: string;
}

export interface ScheduleCallData {
  preferredDate: string; // ISO date
  preferredTime?: string;
  notes?: string;
}

class KYCService {
  /**
   * Initiate KYC verification. Backend expects document_type, optional country.
   */
  async initiateVerification(data: InitiateKYCData): Promise<KYCVerification> {
    const response: AxiosResponse = await apiClient.post('/kyc/initiate', {
      document_type: data.documentType,
      country: data.country,
    });
    return this.mapVerification(response.data?.data ?? response.data);
  }

  /**
   * Upload KYC document (multipart/form-data).
   */
  async uploadDocument(formData: FormData): Promise<{ documentUrl: string }> {
    const response: AxiosResponse = await apiClient.post('/kyc/upload-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.data ?? response.data;
    return {
      documentUrl: data?.document_url ?? data?.documentUrl ?? '',
    };
  }

  /**
   * Schedule video call for KYC.
   */
  async scheduleCall(data: ScheduleCallData): Promise<{ scheduledAt: string }> {
    const response: AxiosResponse = await apiClient.post('/kyc/schedule-call', {
      preferred_date: data.preferredDate,
      preferred_time: data.preferredTime,
      notes: data.notes,
    });
    const resData = response.data?.data ?? response.data;
    return { scheduledAt: resData?.scheduled_at ?? resData?.scheduledAt ?? '' };
  }

  /**
   * Get current user's KYC status.
   */
  async getStatus(): Promise<{ status: KYCStatus; verification?: KYCVerification }> {
    const response: AxiosResponse = await apiClient.get('/kyc/status');
    const data = response.data?.data ?? response.data;
    return {
      status: (data?.status ?? 'PENDING') as KYCStatus,
      verification: data?.verification ? this.mapVerification(data.verification) : undefined,
    };
  }

  /**
   * Get current user's KYC history.
   */
  async getHistory(params?: { page?: number; limit?: number }): Promise<{ data: KYCVerification[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const url = `/kyc/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response: AxiosResponse = await apiClient.get(url);
    const data = response.data?.data ?? response.data;
    const items = Array.isArray(data?.items) ? data.items : (data?.verifications ?? data?.data ?? []);
    const pagination = data?.pagination ?? { page: 1, limit: 20, total: items.length, totalPages: 1 };
    return {
      data: items.map((v: any) => this.mapVerification(v)),
      pagination,
    };
  }

  private mapVerification(raw: any): KYCVerification {
    const v = raw?.verification ?? raw;
    return {
      verificationId: v.verification_id ?? v.verificationId ?? '',
      userId: v.user_id ?? v.userId ?? '',
      method: (v.method ?? 'DOCUMENT') as KYCMethod,
      documentType: v.document_type ?? v.documentType,
      documentUrl: v.document_url ?? v.documentUrl,
      status: (v.status ?? 'PENDING') as KYCStatus,
      reviewedBy: v.reviewed_by ?? v.reviewedBy,
      rejectionReason: v.rejection_reason ?? v.rejectionReason,
      createdAt: v.created_at ?? v.createdAt ?? '',
      reviewedAt: v.reviewed_at ?? v.reviewedAt,
    };
  }
}

export const kycService = new KYCService();
