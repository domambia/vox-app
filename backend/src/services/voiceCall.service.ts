import prisma from '@/config/database';
import { logger } from '@/utils/logger';
import { CallStatus } from '@prisma/client';
import {
  normalizePagination,
  createPaginatedResponse,
  getPaginationMetadata,
} from '@/utils/pagination';

export interface InitiateCallInput {
  receiverId: string;
}

export interface GetCallHistoryParams {
  limit?: number;
  offset?: number;
  status?: CallStatus;
}

export class VoiceCallService {
  /**
   * Initiate a voice call
   */
  async initiateCall(callerId: string, data: InitiateCallInput) {
    try {
      // Verify receiver exists and is active
      const receiver = await prisma.user.findUnique({
        where: { user_id: data.receiverId },
        select: {
          user_id: true,
          is_active: true,
          verified: true,
        },
      });

      if (!receiver) {
        throw new Error('Receiver not found');
      }

      if (!receiver.is_active) {
        throw new Error('Receiver account is inactive');
      }

      // Check if caller and receiver are the same
      if (callerId === data.receiverId) {
        throw new Error('Cannot call yourself');
      }

      // Create call record with WebRTC room name
      const roomName = `call-${callerId}-${data.receiverId}-${Date.now()}`;
      const call = await prisma.voiceCall.create({
        data: {
          caller_id: callerId,
          receiver_id: data.receiverId,
          status: 'INITIATED',
          twilio_room_sid: roomName, // Reusing this field for WebRTC room name
        },
        include: {
          caller: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
          receiver: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
        },
      });

      logger.info(`Call initiated: ${call.call_id} from ${callerId} to ${data.receiverId}`);

      return call;
    } catch (error) {
      logger.error('Error initiating call', error);
      throw error;
    }
  }

  /**
   * Update call status
   */
  async updateCallStatus(callId: string, status: CallStatus, userId: string) {
    try {
      // Get call
      const call = await prisma.voiceCall.findUnique({
        where: { call_id: callId },
      });

      if (!call) {
        throw new Error('Call not found');
      }

      // Verify user is part of the call
      if (call.caller_id !== userId && call.receiver_id !== userId) {
        throw new Error('Unauthorized access to call');
      }

      const updateData: any = {
        status,
        updated_at: new Date(),
      };

      // Set started_at when call is answered
      if (status === 'ANSWERED' && !call.started_at) {
        updateData.started_at = new Date();
      }

      // Set ended_at and calculate duration when call ends
      if (['ENDED', 'REJECTED', 'MISSED', 'CANCELLED'].includes(status)) {
        if (!call.ended_at) {
          updateData.ended_at = new Date();
        }
        if (call.started_at && !call.duration) {
          const duration = Math.floor(
            (new Date().getTime() - call.started_at.getTime()) / 1000
          );
          updateData.duration = duration > 0 ? duration : 0;
        }
      }

      const updatedCall = await prisma.voiceCall.update({
        where: { call_id: callId },
        data: updateData,
        include: {
          caller: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
          receiver: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
        },
      });

      logger.info(`Call ${callId} status updated to ${status}`);

      return updatedCall;
    } catch (error) {
      logger.error('Error updating call status', error);
      throw error;
    }
  }

  /**
   * End a call
   */
  async endCall(callId: string, userId: string) {
    try {
      return await this.updateCallStatus(callId, 'ENDED', userId);
    } catch (error) {
      logger.error('Error ending call', error);
      throw error;
    }
  }

  /**
   * Get call history for a user
   */
  async getCallHistory(userId: string, params: GetCallHistoryParams) {
    try {
      const { limit, offset } = normalizePagination(params.limit, params.offset);

      // Build where clause
      const where: any = {
        OR: [
          { caller_id: userId },
          { receiver_id: userId },
        ],
      };

      if (params.status) {
        where.status = params.status;
      }

      // Get total count
      const total = await prisma.voiceCall.count({ where });

      // Get calls
      const calls = await prisma.voiceCall.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          caller: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
          receiver: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
        },
      });

      const pagination = getPaginationMetadata(total, limit, offset);

      return {
        ...createPaginatedResponse(calls, total, limit, offset),
        pagination,
      };
    } catch (error) {
      logger.error('Error getting call history', error);
      throw error;
    }
  }

  /**
   * Get call by ID
   */
  async getCall(callId: string, userId: string) {
    try {
      const call = await prisma.voiceCall.findUnique({
        where: { call_id: callId },
        include: {
          caller: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
          receiver: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
        },
      });

      if (!call) {
        throw new Error('Call not found');
      }

      // Verify user is part of the call
      if (call.caller_id !== userId && call.receiver_id !== userId) {
        throw new Error('Unauthorized access to call');
      }

      return call;
    } catch (error) {
      logger.error('Error getting call', error);
      throw error;
    }
  }

  /**
   * Get WebRTC configuration (STUN/TURN servers)
   * For production, you should use your own TURN server for NAT traversal
   */
  async getWebRTCConfig() {
    try {
      const { config } = await import('@/config/env');
      
      // Public STUN servers (free, for development)
      const iceServers: Array<{ urls: string; username?: string; credential?: string }> = 
        config.webrtc.stunServers.map((url) => ({
          urls: url,
        }));

      // Add TURN server if configured (required for production/NAT traversal)
      if (config.webrtc.turnServer) {
        iceServers.push({
          urls: config.webrtc.turnServer,
          username: config.webrtc.turnUsername,
          credential: config.webrtc.turnCredential,
        });
      }

      return {
        iceServers,
      };
    } catch (error) {
      logger.error('Error getting WebRTC config', error);
      throw error;
    }
  }

  /**
   * Get call room name for WebRTC signaling
   */
  async getCallRoom(callId: string, userId: string) {
    try {
      const call = await prisma.voiceCall.findUnique({
        where: { call_id: callId },
      });

      if (!call) {
        throw new Error('Call not found');
      }

      // Verify user is part of the call
      if (call.caller_id !== userId && call.receiver_id !== userId) {
        throw new Error('Unauthorized access to call');
      }

      return {
        roomName: call.twilio_room_sid || `call-${callId}`, // Reusing field for room name
        callId: call.call_id,
      };
    } catch (error) {
      logger.error('Error getting call room', error);
      throw error;
    }
  }
}

// Export singleton instance
const voiceCallService = new VoiceCallService();
export default voiceCallService;

