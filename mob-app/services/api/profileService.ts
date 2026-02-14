import { apiClient } from "./apiClient";
import { getApiBaseUrl } from "../../config/env";
import { AxiosResponse } from "axios";

export interface Profile {
  profileId: string;
  userId: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  location?: string;
  interests?: string[];
  lookingFor?: "DATING" | "FRIENDSHIP" | "HOBBY" | "ALL";
  voiceBioUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/** Backend returns snake_case with included user */
interface BackendProfile {
  profile_id: string;
  user_id: string;
  bio?: string | null;
  interests?: string[] | unknown;
  location?: string | null;
  looking_for?: string;
  voice_bio_url?: string | null;
  created_at?: string;
  updated_at?: string;
  user?: {
    user_id: string;
    first_name?: string | null;
    last_name?: string | null;
    phone_number?: string;
    verified?: boolean;
  };
}

function mapBackendProfile(raw: BackendProfile): Profile {
  const interests = Array.isArray(raw.interests)
    ? raw.interests
    : typeof raw.interests === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(raw.interests);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];
  const firstName = raw.user?.first_name ?? undefined;
  const lastName = raw.user?.last_name ?? undefined;
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") || undefined;
  let voiceBioUrl = raw.voice_bio_url ?? undefined;
  if (voiceBioUrl && !voiceBioUrl.startsWith("http")) {
    const base = getApiBaseUrl().replace(/\/api\/v1\/?$/, "");
    voiceBioUrl = voiceBioUrl.startsWith("/")
      ? `${base}${voiceBioUrl}`
      : `${base}/${voiceBioUrl}`;
  }
  return {
    profileId: raw.profile_id,
    userId: raw.user_id,
    displayName: displayName || undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    bio: raw.bio ?? undefined,
    location: raw.location ?? undefined,
    interests,
    lookingFor: (raw.looking_for as Profile["lookingFor"]) ?? "ALL",
    voiceBioUrl,
    createdAt: raw.created_at ?? "",
    updatedAt: raw.updated_at ?? "",
  };
}

export interface CreateProfileData {
  displayName: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  location?: string;
  interests?: string[];
  lookingFor?: "DATING" | "FRIENDSHIP" | "HOBBY" | "ALL";
}

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  location?: string;
  interests?: string[];
  lookingFor?: "DATING" | "FRIENDSHIP" | "HOBBY" | "ALL";
}

class ProfileService {
  /**
   * Get current user's profile (404 when no profile created yet)
   */
  async getMyProfile(): Promise<Profile> {
    const response: AxiosResponse = await apiClient.get("/profile/me");
    const raw = response.data?.data ?? response.data;
    return mapBackendProfile(raw as BackendProfile);
  }

  /**
   * Get profile by user ID
   */
  async getProfile(userId: string): Promise<Profile> {
    const response: AxiosResponse = await apiClient.get(`/profile/${userId}`);
    const raw = response.data?.data ?? response.data;
    return mapBackendProfile(raw as BackendProfile);
  }

  /**
   * Create a new profile
   */
  async createProfile(data: CreateProfileData): Promise<Profile> {
    const body = {
      bio: data.bio ?? "",
      interests: data.interests ?? [],
      location: data.location ?? "",
      lookingFor: data.lookingFor ?? "ALL",
    };
    const response: AxiosResponse = await apiClient.post("/profile", body);
    const raw = response.data?.data ?? response.data;
    return mapBackendProfile(raw as BackendProfile);
  }

  /**
   * Update profile
   */
  async updateProfile(
    userId: string,
    data: UpdateProfileData,
  ): Promise<Profile> {
    const body: Record<string, any> = {};
    if (data.bio !== undefined) body.bio = data.bio;
    if (data.interests !== undefined) body.interests = data.interests;
    if (data.location !== undefined) body.location = data.location;
    if (data.lookingFor !== undefined) body.lookingFor = data.lookingFor;

    const response: AxiosResponse = await apiClient.put(
      `/profile/${userId}`,
      body,
    );
    const raw = response.data?.data ?? response.data;
    return mapBackendProfile(raw as BackendProfile);
  }

  /**
   * Delete profile
   */
  async deleteProfile(userId: string): Promise<void> {
    await apiClient.delete(`/profile/${userId}`);
  }

  /**
   * Upload voice bio
   */
  async uploadVoiceBio(file: FormData): Promise<{ voiceBioUrl: string }> {
    const response: AxiosResponse = await apiClient.post(
      "/profile/voice-bio",
      file,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    const data = response.data?.data ?? response.data;
    let voiceBioUrl = data?.voiceBioUrl ?? data?.voice_bio_url ?? "";
    if (voiceBioUrl && !voiceBioUrl.startsWith("http")) {
      const base = getApiBaseUrl().replace(/\/api\/v1\/?$/, "");
      voiceBioUrl = voiceBioUrl.startsWith("/")
        ? `${base}${voiceBioUrl}`
        : `${base}/${voiceBioUrl}`;
    }
    return { voiceBioUrl };
  }

  /**
   * Delete voice bio
   */
  async deleteVoiceBio(): Promise<void> {
    await apiClient.delete("/profile/voice-bio");
  }

  /**
   * Like a profile. Returns { isMatch, matchId?, message } from backend.
   */
  async likeProfile(
    userId: string,
  ): Promise<{ isMatch: boolean; matchId?: string; message?: string }> {
    const response: AxiosResponse = await apiClient.post(
      `/profile/${userId}/like`,
    );
    const data = response.data?.data ?? response.data;
    return {
      isMatch: data?.isMatch === true,
      matchId: data?.matchId,
      message: data?.message,
    };
  }

  /**
   * Unlike a profile
   */
  async unlikeProfile(userId: string): Promise<void> {
    await apiClient.delete(`/profile/${userId}/like`);
  }
}

export const profileService = new ProfileService();
