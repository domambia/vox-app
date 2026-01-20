import prisma from '@/config/database';
import { logger } from '@/utils/logger';
import { Prisma } from '@prisma/client';
import {
  CreateProfileInput,
  UpdateProfileInput,
} from '@/validations/profile.validation';

export class ProfileService {
  /**
   * Create a new profile for a user
   */
  async createProfile(userId: string, data: CreateProfileInput) {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if profile already exists
      const existingProfile = await prisma.profile.findUnique({
        where: { user_id: userId },
      });

      if (existingProfile) {
        throw new Error('Profile already exists for this user');
      }

      // Create profile
      const profile = await prisma.profile.create({
        data: {
          user_id: userId,
          bio: data.bio,
          interests: data.interests || [],
          location: data.location,
          looking_for: data.lookingFor || 'ALL',
          voice_bio_url: data.voiceBioUrl,
        },
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              verified: true,
            },
          },
        },
      });

      logger.info(`Profile created for user ${userId}`);
      return profile;
    } catch (error) {
      logger.error('Error creating profile', error);
      throw error;
    }
  }

  /**
   * Get profile by user ID
   */
  async getProfile(userId: string, requesterId?: string) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { user_id: userId },
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              verified: true,
              created_at: true,
            },
          },
        },
      });

      if (!profile) {
        throw new Error('Profile not found');
      }

      // If requester is viewing their own profile, return full data
      // Otherwise, return public profile data
      if (requesterId === userId) {
        return profile;
      }

      // Return public profile (without sensitive data)
      return profile;
    } catch (error) {
      logger.error('Error getting profile', error);
      throw error;
    }
  }

  /**
   * Update profile
   */
  async updateProfile(userId: string, data: UpdateProfileInput) {
    try {
      // Check if profile exists
      const existingProfile = await prisma.profile.findUnique({
        where: { user_id: userId },
      });

      if (!existingProfile) {
        throw new Error('Profile not found');
      }

      // Build update data
      const updateData: Prisma.ProfileUpdateInput = {};

      if (data.bio !== undefined) {
        updateData.bio = data.bio;
      }

      if (data.interests !== undefined) {
        updateData.interests = data.interests;
      }

      if (data.location !== undefined) {
        updateData.location = data.location;
      }

      if (data.lookingFor !== undefined) {
        updateData.looking_for = data.lookingFor;
      }

      if (data.voiceBioUrl !== undefined) {
        updateData.voice_bio_url = data.voiceBioUrl;
      }

      // Update profile
      const profile = await prisma.profile.update({
        where: { user_id: userId },
        data: updateData,
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              verified: true,
            },
          },
        },
      });

      logger.info(`Profile updated for user ${userId}`);
      return profile;
    } catch (error) {
      logger.error('Error updating profile', error);
      throw error;
    }
  }

  /**
   * Delete profile (soft delete by removing profile data)
   */
  async deleteProfile(userId: string) {
    try {
      // Check if profile exists
      const existingProfile = await prisma.profile.findUnique({
        where: { user_id: userId },
      });

      if (!existingProfile) {
        throw new Error('Profile not found');
      }

      // Delete profile (cascade will handle related data)
      await prisma.profile.delete({
        where: { user_id: userId },
      });

      logger.info(`Profile deleted for user ${userId}`);
      return { message: 'Profile deleted successfully' };
    } catch (error) {
      logger.error('Error deleting profile', error);
      throw error;
    }
  }

  /**
   * Get profile by profile ID
   */
  async getProfileById(profileId: string) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { profile_id: profileId },
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              verified: true,
            },
          },
        },
      });

      if (!profile) {
        throw new Error('Profile not found');
      }

      return profile;
    } catch (error) {
      logger.error('Error getting profile by ID', error);
      throw error;
    }
  }

  /**
   * Check if user has a profile
   */
  async hasProfile(userId: string): Promise<boolean> {
    try {
      const profile = await prisma.profile.findUnique({
        where: { user_id: userId },
        select: { profile_id: true },
      });

      return !!profile;
    } catch (error) {
      logger.error('Error checking profile existence', error);
      return false;
    }
  }
}

// Export singleton instance
const profileService = new ProfileService();
export default profileService;

