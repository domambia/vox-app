import { apiClient } from "./apiClient";
import { AxiosResponse } from "axios";

export type CallStatus =
  | "INITIATED"
  | "RINGING"
  | "ANSWERED"
  | "REJECTED"
  | "MISSED"
  | "ENDED"
  | "CANCELLED";

export interface VoiceCall {
  callId: string;
  callerId: string;
  receiverId: string;
  status: CallStatus;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  twilioRoomSid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InitiateCallData {
  receiverId: string;
}

export interface UpdateCallStatusData {
  status: CallStatus;
}

export interface PaginatedCallsResponse {
  data: VoiceCall[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class VoiceCallService {
  /**
   * Initiate a voice call. Backend expects receiver_id.
   */
  async initiateCall(data: InitiateCallData): Promise<VoiceCall> {
    const response: AxiosResponse = await apiClient.post("/calls/initiate", {
      receiverId: data.receiverId,
    });
    return this.mapCall(response.data?.data ?? response.data);
  }

  /**
   * Update call status (e.g. RINGING, ANSWERED, REJECTED).
   */
  async updateCallStatus(
    callId: string,
    data: UpdateCallStatusData,
  ): Promise<VoiceCall> {
    const response: AxiosResponse = await apiClient.put(
      `/calls/${callId}/status`,
      {
        status: data.status,
      },
    );
    return this.mapCall(response.data?.data ?? response.data);
  }

  /**
   * End a call.
   */
  async endCall(callId: string): Promise<VoiceCall> {
    const response: AxiosResponse = await apiClient.post(
      `/calls/${callId}/end`,
    );
    return this.mapCall(response.data?.data ?? response.data);
  }

  /**
   * Get call history for current user.
   */
  async getCallHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedCallsResponse> {
    const queryParams = new URLSearchParams();
    const limit = params?.limit;
    const page = params?.page;
    if (limit) queryParams.append("limit", limit.toString());
    if (page && limit)
      queryParams.append("offset", ((page - 1) * limit).toString());
    const url = `/calls/history${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response: AxiosResponse = await apiClient.get(url);
    const data = response.data?.data ?? response.data;
    const items = Array.isArray(data?.items)
      ? data.items
      : (data?.calls ?? data?.data ?? []);
    const pagination = data?.pagination ?? {
      page: 1,
      limit: 20,
      total: items.length,
      totalPages: 1,
    };
    return {
      data: items.map((c: any) => this.mapCall(c)),
      pagination,
    };
  }

  /**
   * Get a single call by ID.
   */
  async getCall(callId: string): Promise<VoiceCall> {
    const response: AxiosResponse = await apiClient.get(`/calls/${callId}`);
    return this.mapCall(response.data?.data ?? response.data);
  }

  /**
   * Get WebRTC/TURN config for calls.
   */
  async getWebRTCConfig(): Promise<{ iceServers?: any[]; [key: string]: any }> {
    const response: AxiosResponse = await apiClient.get("/calls/webrtc-config");
    return response.data?.data ?? response.data ?? {};
  }

  /**
   * Get Twilio room SID for a call (if applicable).
   */
  async getCallRoom(
    callId: string,
  ): Promise<{ roomSid?: string; [key: string]: any }> {
    const response: AxiosResponse = await apiClient.get(
      `/calls/${callId}/room`,
    );
    return response.data?.data ?? response.data ?? {};
  }

  private mapCall(raw: any): VoiceCall {
    const c = raw?.call ?? raw;
    return {
      callId: c.call_id ?? c.callId ?? "",
      callerId: c.caller_id ?? c.callerId ?? "",
      receiverId: c.receiver_id ?? c.receiverId ?? "",
      status: (c.status ?? "INITIATED") as CallStatus,
      startedAt: c.started_at ?? c.startedAt,
      endedAt: c.ended_at ?? c.endedAt,
      duration: c.duration ?? undefined,
      twilioRoomSid: c.twilio_room_sid ?? c.twilioRoomSid,
      createdAt: c.created_at ?? c.createdAt ?? "",
      updatedAt: c.updated_at ?? c.updatedAt ?? "",
    };
  }
}

export const voiceCallService = new VoiceCallService();
