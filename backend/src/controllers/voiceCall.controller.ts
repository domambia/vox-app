import { Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import voiceCallService from '@/services/voiceCall.service';
import { AuthRequest } from '@/types';
import { extractPaginationFromQuery } from '@/utils/pagination';

export class VoiceCallController {
  /**
   * Initiate a voice call
   * POST /api/v1/calls/initiate
   */
  async initiateCall(req: AuthRequest, res: Response): Promise<void> {
    try {
      const callerId = req.user!.userId;
      const data = req.body;

      const call = await voiceCallService.initiateCall(callerId, data);
      sendSuccess(res, call, 201);
    } catch (error: any) {
      if (error.message === 'Receiver not found') {
        sendError(res, 'USER_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'CALL_INITIATE_ERROR', error.message || 'Failed to initiate call', 400);
    }
  }

  /**
   * Update call status
   * PUT /api/v1/calls/:callId/status
   */
  async updateCallStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { callId } = req.params;
      const userId = req.user!.userId;
      const { status } = req.body;

      const call = await voiceCallService.updateCallStatus(callId, status, userId);
      sendSuccess(res, call);
    } catch (error: any) {
      if (error.message === 'Call not found') {
        sendError(res, 'CALL_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message === 'Unauthorized access to call') {
        sendError(res, 'FORBIDDEN', error.message, 403);
        return;
      }
      sendError(res, 'CALL_UPDATE_ERROR', error.message || 'Failed to update call status', 400);
    }
  }

  /**
   * End a call
   * POST /api/v1/calls/:callId/end
   */
  async endCall(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { callId } = req.params;
      const userId = req.user!.userId;

      const call = await voiceCallService.endCall(callId, userId);
      sendSuccess(res, call);
    } catch (error: any) {
      if (error.message === 'Call not found') {
        sendError(res, 'CALL_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message === 'Unauthorized access to call') {
        sendError(res, 'FORBIDDEN', error.message, 403);
        return;
      }
      sendError(res, 'CALL_END_ERROR', error.message || 'Failed to end call', 400);
    }
  }

  /**
   * Get call history
   * GET /api/v1/calls/history
   */
  async getCallHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { limit, offset } = extractPaginationFromQuery(req.query);
      const status = req.query.status as string | undefined;

      const result = await voiceCallService.getCallHistory(userId, {
        limit,
        offset,
        status: status as any,
      });

      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, 'CALL_HISTORY_ERROR', error.message || 'Failed to get call history', 400);
    }
  }

  /**
   * Get call by ID
   * GET /api/v1/calls/:callId
   */
  async getCall(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { callId } = req.params;
      const userId = req.user!.userId;

      const call = await voiceCallService.getCall(callId, userId);
      sendSuccess(res, call);
    } catch (error: any) {
      if (error.message === 'Call not found') {
        sendError(res, 'CALL_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message === 'Unauthorized access to call') {
        sendError(res, 'FORBIDDEN', error.message, 403);
        return;
      }
      sendError(res, 'CALL_FETCH_ERROR', error.message || 'Failed to get call', 400);
    }
  }

  /**
   * Generate Twilio token
   * POST /api/v1/calls/token
   */
  async generateToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { roomName } = req.body;

      const result = await voiceCallService.generateTwilioToken(userId, roomName || '');
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Twilio not configured') {
        sendError(res, 'SERVICE_UNAVAILABLE', error.message, 503);
        return;
      }
      sendError(res, 'TOKEN_GENERATION_ERROR', error.message || 'Failed to generate token', 400);
    }
  }
}

// Export singleton instance
const voiceCallController = new VoiceCallController();
export default voiceCallController;

