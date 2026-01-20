import { Request, Response } from 'express';
import { ProfileController } from '@/controllers/profile.controller';
import profileService from '@/services/profile.service';
import { AuthRequest } from '@/types';

// Mock the service
jest.mock('@/services/profile.service');
jest.mock('@/utils/fileUpload');
jest.mock('@/utils/response');

describe('ProfileController', () => {
  let profileController: ProfileController;
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    profileController = new ProfileController();
    jest.clearAllMocks();

    mockRequest = {
      user: {
        userId: 'user-123',
        phoneNumber: '+35612345678',
        verified: true,
      },
      body: {},
      params: {},
      file: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('createProfile', () => {
    it('should create profile successfully', async () => {
      const profileData = {
        bio: 'Test bio',
        interests: ['sports'],
        location: 'Valletta',
        lookingFor: 'FRIENDSHIP' as const,
      };

      mockRequest.body = profileData;

      const mockProfile = {
        profile_id: 'profile-123',
        user_id: 'user-123',
        ...profileData,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (profileService.createProfile as jest.Mock).mockResolvedValue(mockProfile);

      await profileController.createProfile(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(profileService.createProfile).toHaveBeenCalledWith('user-123', profileData);
    });

    it('should handle profile already exists error', async () => {
      mockRequest.body = { bio: 'Test bio' };

      (profileService.createProfile as jest.Mock).mockRejectedValue(
        new Error('Profile already exists for this user')
      );

      await profileController.createProfile(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Error should be handled by sendError
      expect(profileService.createProfile).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should get profile successfully', async () => {
      mockRequest.params = { userId: 'user-123' };

      const mockProfile = {
        profile_id: 'profile-123',
        user_id: 'user-123',
        bio: 'Test bio',
      };

      (profileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);

      await profileController.getProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(profileService.getProfile).toHaveBeenCalledWith('user-123', 'user-123');
    });

    it('should handle profile not found error', async () => {
      mockRequest.params = { userId: 'user-123' };

      (profileService.getProfile as jest.Mock).mockRejectedValue(
        new Error('Profile not found')
      );

      await profileController.getProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(profileService.getProfile).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should update own profile successfully', async () => {
      mockRequest.params = { userId: 'user-123' };
      mockRequest.body = { bio: 'Updated bio' };

      const mockProfile = {
        profile_id: 'profile-123',
        user_id: 'user-123',
        bio: 'Updated bio',
      };

      (profileService.updateProfile as jest.Mock).mockResolvedValue(mockProfile);

      await profileController.updateProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(profileService.updateProfile).toHaveBeenCalledWith('user-123', {
        bio: 'Updated bio',
      });
    });

    it('should reject updating another user profile', async () => {
      mockRequest.params = { userId: 'other-user-123' };
      mockRequest.body = { bio: 'Updated bio' };

      await profileController.updateProfile(mockRequest as AuthRequest, mockResponse as Response);

      // Should not call service, should return error
      expect(profileService.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('deleteProfile', () => {
    it('should delete own profile successfully', async () => {
      mockRequest.params = { userId: 'user-123' };

      const mockProfile = {
        profile_id: 'profile-123',
        user_id: 'user-123',
        voice_bio_url: null,
      };

      (profileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);
      (profileService.deleteProfile as jest.Mock).mockResolvedValue({
        message: 'Profile deleted successfully',
      });

      await profileController.deleteProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(profileService.deleteProfile).toHaveBeenCalledWith('user-123');
    });

    it('should reject deleting another user profile', async () => {
      mockRequest.params = { userId: 'other-user-123' };

      await profileController.deleteProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(profileService.deleteProfile).not.toHaveBeenCalled();
    });
  });
});

