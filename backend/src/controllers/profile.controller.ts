import { Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import profileService from '@/services/profile.service';
import { AuthRequest } from '@/types';
import { getFileUrl, deleteFile, getFilePathFromUrl } from '@/utils/fileUpload';
import { logger } from '@/utils/logger';

export class ProfileController {
  /**
   * Create a new profile
   * POST /api/v1/profile
   */
  async createProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = req.body;

      const profile = await profileService.createProfile(userId, data);
      sendSuccess(res, profile, 201);
    } catch (error: any) {
      if (error.message === 'Profile already exists for this user') {
        sendError(res, 'PROFILE_EXISTS', error.message, 409);
        return;
      }
      if (error.message === 'User not found') {
        sendError(res, 'USER_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'PROFILE_CREATION_ERROR', error.message || 'Failed to create profile', 400);
    }
  }

  /**
   * Get profile by user ID
   * GET /api/v1/profile/:userId
   */
  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requesterId = req.user?.userId;

      const profile = await profileService.getProfile(userId, requesterId);
      sendSuccess(res, profile);
    } catch (error: any) {
      if (error.message === 'Profile not found') {
        sendError(res, 'PROFILE_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'PROFILE_FETCH_ERROR', error.message || 'Failed to fetch profile', 400);
    }
  }

  /**
   * Get current user's profile
   * GET /api/v1/profile/me
   */
  async getMyProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const profile = await profileService.getProfile(userId, userId);
      sendSuccess(res, profile);
    } catch (error: any) {
      if (error.message === 'Profile not found') {
        sendError(res, 'PROFILE_NOT_FOUND', 'You have not created a profile yet', 404);
        return;
      }
      sendError(res, 'PROFILE_FETCH_ERROR', error.message || 'Failed to fetch profile', 400);
    }
  }

  /**
   * Update profile
   * PUT /api/v1/profile/:userId
   */
  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requesterId = req.user!.userId;

      // Check if user is updating their own profile
      if (userId !== requesterId) {
        sendError(res, 'FORBIDDEN', 'You can only update your own profile', 403);
        return;
      }

      const data = req.body;
      const profile = await profileService.updateProfile(userId, data);
      sendSuccess(res, profile);
    } catch (error: any) {
      if (error.message === 'Profile not found') {
        sendError(res, 'PROFILE_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'PROFILE_UPDATE_ERROR', error.message || 'Failed to update profile', 400);
    }
  }

  /**
   * Delete profile
   * DELETE /api/v1/profile/:userId
   */
  async deleteProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requesterId = req.user!.userId;

      // Check if user is deleting their own profile
      if (userId !== requesterId) {
        sendError(res, 'FORBIDDEN', 'You can only delete your own profile', 403);
        return;
      }

      // Get profile to check for voice bio URL
      const profile = await profileService.getProfile(userId, requesterId);

      // Delete voice bio file if exists
      if (profile.voice_bio_url) {
        try {
          const filePath = getFilePathFromUrl(profile.voice_bio_url);
          await deleteFile(filePath);
        } catch (fileError) {
          logger.warn('Failed to delete voice bio file', fileError);
          // Continue with profile deletion even if file deletion fails
        }
      }

      const result = await profileService.deleteProfile(userId);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Profile not found') {
        sendError(res, 'PROFILE_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'PROFILE_DELETE_ERROR', error.message || 'Failed to delete profile', 400);
    }
  }

  /**
   * Upload voice bio
   * POST /api/v1/profile/voice-bio
   */
  async uploadVoiceBio(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const file = req.file;

      if (!file) {
        sendError(res, 'VALIDATION_ERROR', 'Voice bio file is required', 400);
        return;
      }

      // Validate file type (audio only)
      const allowedMimes = ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg'];
      if (!allowedMimes.includes(file.mimetype)) {
        sendError(res, 'VALIDATION_ERROR', 'Invalid file type. Only audio files are allowed', 400);
        return;
      }

      // Get file URL
      const fileUrl = getFileUrl(file.path);

      // Update profile with voice bio URL
      const profile = await profileService.updateProfile(userId, {
        voiceBioUrl: fileUrl,
      });

      sendSuccess(res, {
        profile,
        voiceBioUrl: fileUrl,
        message: 'Voice bio uploaded successfully',
      });
    } catch (error: any) {
      sendError(res, 'VOICE_BIO_UPLOAD_ERROR', error.message || 'Failed to upload voice bio', 400);
    }
  }

  /**
   * Delete voice bio
   * DELETE /api/v1/profile/voice-bio
   */
  async deleteVoiceBio(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      // Get current profile
      const profile = await profileService.getProfile(userId, userId);

      if (!profile.voice_bio_url) {
        sendError(res, 'NOT_FOUND', 'No voice bio found', 404);
        return;
      }

      // Delete file
      try {
        const filePath = getFilePathFromUrl(profile.voice_bio_url);
        await deleteFile(filePath);
      } catch (fileError) {
        logger.warn('Failed to delete voice bio file', fileError);
        // Continue with profile update even if file deletion fails
      }

      // Update profile to remove voice bio URL
      const updatedProfile = await profileService.updateProfile(userId, {
        voiceBioUrl: '',
      });

      sendSuccess(res, {
        profile: updatedProfile,
        message: 'Voice bio deleted successfully',
      });
    } catch (error: any) {
      sendError(res, 'VOICE_BIO_DELETE_ERROR', error.message || 'Failed to delete voice bio', 400);
    }
  }
}

// Export singleton instance
const profileController = new ProfileController();
export default profileController;

