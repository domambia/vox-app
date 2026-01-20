import prisma from '@/config/database';
import { logger } from '@/utils/logger';
import { KYCMethod } from '@prisma/client';

export interface InitiateVerificationInput {
  method: KYCMethod;
}

export interface UploadDocumentInput {
  documentType: string;
  documentUrl: string;
}

export interface ScheduleCallInput {
  preferredDate: string;
  preferredTime: string;
  timezone: string;
}

export class KYCService {
  /**
   * Initiate KYC verification process
   */
  async initiateVerification(userId: string, data: InitiateVerificationInput) {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if there's already a pending verification
      const existingVerification = await prisma.kYCVerification.findFirst({
        where: {
          user_id: userId,
          status: 'PENDING',
        },
      });

      if (existingVerification) {
        throw new Error('Verification already in progress');
      }

      // Create verification record
      const verification = await prisma.kYCVerification.create({
        data: {
          user_id: userId,
          method: data.method,
          status: 'PENDING',
        },
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
        },
      });

      logger.info(`KYC verification initiated for user ${userId}`, {
        verificationId: verification.verification_id,
        method: data.method,
      });

      return verification;
    } catch (error) {
      logger.error('Error initiating KYC verification', error);
      throw error;
    }
  }

  /**
   * Upload verification document
   */
  async uploadDocument(userId: string, data: UploadDocumentInput) {
    try {
      // Find pending verification for this user
      const verification = await prisma.kYCVerification.findFirst({
        where: {
          user_id: userId,
          status: 'PENDING',
          method: 'DOCUMENT',
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (!verification) {
        throw new Error('No pending document verification found. Please initiate verification first.');
      }

      // Update verification with document info
      const updatedVerification = await prisma.kYCVerification.update({
        where: { verification_id: verification.verification_id },
        data: {
          document_type: data.documentType,
          document_url: data.documentUrl,
          status: 'PENDING', // Still pending until reviewed
        },
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      logger.info(`Document uploaded for verification ${verification.verification_id}`);

      return updatedVerification;
    } catch (error) {
      logger.error('Error uploading document', error);
      throw error;
    }
  }

  /**
   * Schedule video call verification
   */
  async scheduleCall(userId: string, data: ScheduleCallInput) {
    try {
      // Find pending verification for this user
      const verification = await prisma.kYCVerification.findFirst({
        where: {
          user_id: userId,
          status: 'PENDING',
          method: 'VIDEO_CALL',
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (!verification) {
        throw new Error('No pending video call verification found. Please initiate verification first.');
      }

      // Parse date and time
      const scheduledDateTime = new Date(`${data.preferredDate}T${data.preferredTime}`);
      
      // For now, we'll just update the verification
      // In Phase 2, this would integrate with Zoom/Google Meet API
      const updatedVerification = await prisma.kYCVerification.update({
        where: { verification_id: verification.verification_id },
        data: {
          // Store scheduling info (could add a separate field for this)
          status: 'PENDING',
        },
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      logger.info(`Video call scheduled for verification ${verification.verification_id}`);

      return {
        ...updatedVerification,
        scheduledAt: scheduledDateTime,
        meetingLink: null, // Would be generated in Phase 2 with actual integration
      };
    } catch (error) {
      logger.error('Error scheduling video call', error);
      throw error;
    }
  }

  /**
   * Get verification status for a user
   */
  async getVerificationStatus(userId: string) {
    try {
      const verification = await prisma.kYCVerification.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        include: {
          reviewer: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      if (!verification) {
        return null;
      }

      return verification;
    } catch (error) {
      logger.error('Error getting verification status', error);
      throw error;
    }
  }

  /**
   * Get verification history for a user
   */
  async getVerificationHistory(userId: string) {
    try {
      const verifications = await prisma.kYCVerification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        include: {
          reviewer: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      return verifications;
    } catch (error) {
      logger.error('Error getting verification history', error);
      throw error;
    }
  }

  /**
   * Approve verification (admin/moderator only)
   */
  async approveVerification(verificationId: string, reviewerId: string) {
    try {
      const verification = await prisma.kYCVerification.findUnique({
        where: { verification_id: verificationId },
        include: {
          user: true,
        },
      });

      if (!verification) {
        throw new Error('Verification not found');
      }

      if (verification.status !== 'PENDING') {
        throw new Error(`Cannot approve verification with status: ${verification.status}`);
      }

      // Update verification
      const updatedVerification = await prisma.kYCVerification.update({
        where: { verification_id: verificationId },
        data: {
          status: 'APPROVED',
          reviewed_by: reviewerId,
          reviewed_at: new Date(),
        },
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
            },
          },
          reviewer: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      // Update user verification status
      await prisma.user.update({
        where: { user_id: verification.user_id },
        data: {
          verified: true,
          verification_date: new Date(),
        },
      });

      logger.info(`Verification ${verificationId} approved by ${reviewerId}`);

      return updatedVerification;
    } catch (error) {
      logger.error('Error approving verification', error);
      throw error;
    }
  }

  /**
   * Reject verification (admin/moderator only)
   */
  async rejectVerification(
    verificationId: string,
    reviewerId: string,
    rejectionReason: string
  ) {
    try {
      const verification = await prisma.kYCVerification.findUnique({
        where: { verification_id: verificationId },
      });

      if (!verification) {
        throw new Error('Verification not found');
      }

      if (verification.status !== 'PENDING') {
        throw new Error(`Cannot reject verification with status: ${verification.status}`);
      }

      // Update verification
      const updatedVerification = await prisma.kYCVerification.update({
        where: { verification_id: verificationId },
        data: {
          status: 'REJECTED',
          reviewed_by: reviewerId,
          reviewed_at: new Date(),
          rejection_reason: rejectionReason,
        },
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
            },
          },
          reviewer: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      logger.info(`Verification ${verificationId} rejected by ${reviewerId}`);

      return updatedVerification;
    } catch (error) {
      logger.error('Error rejecting verification', error);
      throw error;
    }
  }

  /**
   * Get all pending verifications (admin/moderator only)
   */
  async getPendingVerifications(limit: number = 50, offset: number = 0) {
    try {
      const verifications = await prisma.kYCVerification.findMany({
        where: { status: 'PENDING' },
        orderBy: { created_at: 'asc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              email: true,
              created_at: true,
            },
          },
        },
      });

      const total = await prisma.kYCVerification.count({
        where: { status: 'PENDING' },
      });

      return {
        verifications,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + verifications.length < total,
        },
      };
    } catch (error) {
      logger.error('Error getting pending verifications', error);
      throw error;
    }
  }
}

// Export singleton instance
const kycService = new KYCService();
export default kycService;

