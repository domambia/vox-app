import { Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import kycService from '@/services/kyc.service';
import { AuthRequest } from '@/types';
import { getFileUrl } from '@/utils/fileUpload';

export class KYCController {
  /**
   * Initiate KYC verification
   * POST /api/v1/kyc/initiate
   */
  async initiateVerification(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = req.body;

      const verification = await kycService.initiateVerification(userId, data);
      sendSuccess(res, verification, 201);
    } catch (error: any) {
      if (error.message === 'User not found') {
        sendError(res, 'USER_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message === 'Verification already in progress') {
        sendError(res, 'VERIFICATION_IN_PROGRESS', error.message, 409);
        return;
      }
      sendError(res, 'KYC_INITIATION_ERROR', error.message || 'Failed to initiate verification', 400);
    }
  }

  /**
   * Upload verification document
   * POST /api/v1/kyc/upload-document
   */
  async uploadDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const file = req.file;

      if (!file) {
        sendError(res, 'VALIDATION_ERROR', 'Document file is required', 400);
        return;
      }

      // Validate file type (PDF or image)
      const allowedMimes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
      ];
      if (!allowedMimes.includes(file.mimetype)) {
        sendError(res, 'VALIDATION_ERROR', 'Invalid file type. Only PDF and images are allowed', 400);
        return;
      }

      // Get file URL
      const fileUrl = getFileUrl(file.path);

      // Determine document type from filename or request
      const documentType = req.body.documentType || 'passport';

      const verification = await kycService.uploadDocument(userId, {
        documentType,
        documentUrl: fileUrl,
      });

      sendSuccess(res, {
        verification,
        message: 'Document uploaded successfully. Awaiting review.',
      });
    } catch (error: any) {
      if (error.message.includes('No pending document verification')) {
        sendError(res, 'NO_PENDING_VERIFICATION', error.message, 404);
        return;
      }
      sendError(res, 'DOCUMENT_UPLOAD_ERROR', error.message || 'Failed to upload document', 400);
    }
  }

  /**
   * Schedule video call verification
   * POST /api/v1/kyc/schedule-call
   */
  async scheduleCall(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = req.body;

      const result = await kycService.scheduleCall(userId, data);

      sendSuccess(res, {
        verification: result,
        message: 'Video call scheduled. You will receive meeting details soon.',
      });
    } catch (error: any) {
      if (error.message.includes('No pending video call verification')) {
        sendError(res, 'NO_PENDING_VERIFICATION', error.message, 404);
        return;
      }
      sendError(res, 'SCHEDULE_CALL_ERROR', error.message || 'Failed to schedule call', 400);
    }
  }

  /**
   * Get verification status
   * GET /api/v1/kyc/status
   */
  async getVerificationStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const verification = await kycService.getVerificationStatus(userId);

      if (!verification) {
        sendSuccess(res, {
          status: 'NOT_STARTED',
          message: 'No verification found',
        });
        return;
      }

      sendSuccess(res, verification);
    } catch (error: any) {
      sendError(res, 'KYC_STATUS_ERROR', error.message || 'Failed to get verification status', 400);
    }
  }

  /**
   * Get verification history
   * GET /api/v1/kyc/history
   */
  async getVerificationHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const history = await kycService.getVerificationHistory(userId);

      sendSuccess(res, {
        history,
      });
    } catch (error: any) {
      sendError(res, 'KYC_HISTORY_ERROR', error.message || 'Failed to get verification history', 400);
    }
  }

  /**
   * Approve verification (admin/moderator only)
   * POST /api/v1/kyc/:verificationId/approve
   */
  async approveVerification(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { verificationId } = req.params;
      const reviewerId = req.user!.userId;

      const verification = await kycService.approveVerification(verificationId, reviewerId);

      sendSuccess(res, {
        verification,
        message: 'Verification approved successfully',
      });
    } catch (error: any) {
      if (error.message === 'Verification not found') {
        sendError(res, 'VERIFICATION_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message.includes('Cannot approve verification')) {
        sendError(res, 'INVALID_STATUS', error.message, 400);
        return;
      }
      sendError(res, 'APPROVE_ERROR', error.message || 'Failed to approve verification', 400);
    }
  }

  /**
   * Reject verification (admin/moderator only)
   * POST /api/v1/kyc/:verificationId/reject
   */
  async rejectVerification(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { verificationId } = req.params;
      const reviewerId = req.user!.userId;
      const { rejectionReason } = req.body;

      const verification = await kycService.rejectVerification(
        verificationId,
        reviewerId,
        rejectionReason
      );

      sendSuccess(res, {
        verification,
        message: 'Verification rejected',
      });
    } catch (error: any) {
      if (error.message === 'Verification not found') {
        sendError(res, 'VERIFICATION_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message.includes('Cannot reject verification')) {
        sendError(res, 'INVALID_STATUS', error.message, 400);
        return;
      }
      sendError(res, 'REJECT_ERROR', error.message || 'Failed to reject verification', 400);
    }
  }

  /**
   * Get pending verifications (admin/moderator only)
   * GET /api/v1/kyc/pending
   */
  async getPendingVerifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const result = await kycService.getPendingVerifications(limit, offset);

      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, 'PENDING_VERIFICATIONS_ERROR', error.message || 'Failed to get pending verifications', 400);
    }
  }
}

// Export singleton instance
const kycController = new KYCController();
export default kycController;

