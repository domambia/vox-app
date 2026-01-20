import { ProfileService } from '@/services/profile.service';
import prisma from '@/config/database';
import { CreateProfileInput } from '@/validations/profile.validation';

// Mock Prisma
jest.mock('@/config/database', () => ({
  __esModule: true,
  default: {
    profile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe('ProfileService', () => {
  let profileService: ProfileService;

  beforeEach(() => {
    profileService = new ProfileService();
    jest.clearAllMocks();
  });

  describe('createProfile', () => {
    it('should create a profile successfully', async () => {
      const userId = 'user-123';
      const profileData: CreateProfileInput = {
        bio: 'Test bio',
        interests: ['sports', 'music'],
        location: 'Valletta, Malta',
        lookingFor: 'FRIENDSHIP',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        user_id: userId,
      });

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      (prisma.profile.create as jest.Mock).mockResolvedValue({
        profile_id: 'profile-123',
        user_id: userId,
        ...profileData,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await profileService.createProfile(userId, profileData);

      expect(result).toBeDefined();
      expect(result.user_id).toBe(userId);
      expect(prisma.profile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: userId,
          bio: profileData.bio,
          interests: profileData.interests,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw error if user not found', async () => {
      const userId = 'user-123';
      const profileData: CreateProfileInput = {
        bio: 'Test bio',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(profileService.createProfile(userId, profileData)).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error if profile already exists', async () => {
      const userId = 'user-123';
      const profileData: CreateProfileInput = {
        bio: 'Test bio',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        user_id: userId,
      });

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        profile_id: 'existing-profile',
      });

      await expect(profileService.createProfile(userId, profileData)).rejects.toThrow(
        'Profile already exists for this user'
      );
    });
  });

  describe('getProfile', () => {
    it('should get profile successfully', async () => {
      const userId = 'user-123';

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        profile_id: 'profile-123',
        user_id: userId,
        bio: 'Test bio',
        interests: ['sports'],
        location: 'Valletta',
        looking_for: 'FRIENDSHIP',
        voice_bio_url: null,
        created_at: new Date(),
        updated_at: new Date(),
        user: {
          user_id: userId,
          first_name: 'John',
          last_name: 'Doe',
          phone_number: '+35612345678',
          verified: true,
        },
      });

      const result = await profileService.getProfile(userId);

      expect(result).toBeDefined();
      expect(result.user_id).toBe(userId);
      expect(prisma.profile.findUnique).toHaveBeenCalledWith({
        where: { user_id: userId },
        include: expect.any(Object),
      });
    });

    it('should throw error if profile not found', async () => {
      const userId = 'user-123';

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(profileService.getProfile(userId)).rejects.toThrow('Profile not found');
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const userId = 'user-123';
      const updateData = {
        bio: 'Updated bio',
        interests: ['sports', 'music', 'travel'],
      };

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        profile_id: 'profile-123',
        user_id: userId,
      });

      (prisma.profile.update as jest.Mock).mockResolvedValue({
        profile_id: 'profile-123',
        user_id: userId,
        ...updateData,
        updated_at: new Date(),
      });

      const result = await profileService.updateProfile(userId, updateData);

      expect(result).toBeDefined();
      expect(prisma.profile.update).toHaveBeenCalled();
    });

    it('should throw error if profile not found', async () => {
      const userId = 'user-123';
      const updateData = { bio: 'Updated bio' };

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(profileService.updateProfile(userId, updateData)).rejects.toThrow(
        'Profile not found'
      );
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile successfully', async () => {
      const userId = 'user-123';

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        profile_id: 'profile-123',
        user_id: userId,
      });

      (prisma.profile.delete as jest.Mock).mockResolvedValue({});

      const result = await profileService.deleteProfile(userId);

      expect(result.message).toBe('Profile deleted successfully');
      expect(prisma.profile.delete).toHaveBeenCalledWith({
        where: { user_id: userId },
      });
    });

    it('should throw error if profile not found', async () => {
      const userId = 'user-123';

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(profileService.deleteProfile(userId)).rejects.toThrow('Profile not found');
    });
  });

  describe('hasProfile', () => {
    it('should return true if profile exists', async () => {
      const userId = 'user-123';

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
        profile_id: 'profile-123',
      });

      const result = await profileService.hasProfile(userId);

      expect(result).toBe(true);
    });

    it('should return false if profile does not exist', async () => {
      const userId = 'user-123';

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await profileService.hasProfile(userId);

      expect(result).toBe(false);
    });
  });
});

