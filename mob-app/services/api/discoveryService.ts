import { apiClient } from './apiClient';
import { AxiosResponse } from 'axios';

export interface DiscoverProfile {
  userId: string;
  profileId: string;
  displayName?: string;
  bio?: string;
  dateOfBirth?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  location?: string;
  interests?: string[];
  lookingFor?: 'DATING' | 'FRIENDSHIP' | 'HOBBY' | 'ALL';
  voiceBioUrl?: string;
  photos?: string[];
  distance?: number; // in km
  isLiked?: boolean;
  hasLikedYou?: boolean;
  createdAt: string;
}

export interface Match {
  userId: string;
  profileId: string;
  displayName?: string;
  bio?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  location?: string;
  voiceBioUrl?: string;
  photos?: string[];
  matchedAt: string;
  lastMessageAt?: string;
}

export interface Like {
  userId: string;
  profileId: string;
  displayName?: string;
  bio?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  location?: string;
  voiceBioUrl?: string;
  photos?: string[];
  likedAt: string;
  type: 'given' | 'received';
}

export interface DiscoverProfilesParams {
  page?: number;
  limit?: number;
  minAge?: number;
  maxAge?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  location?: string;
  lookingFor?: 'DATING' | 'FRIENDSHIP' | 'HOBBY' | 'ALL';
}

export interface GetMatchesParams {
  page?: number;
  limit?: number;
}

export interface GetLikesParams {
  page?: number;
  limit?: number;
  type?: 'given' | 'received';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class DiscoveryService {
  /**
   * Discover profile suggestions
   */
  async discoverProfiles(params?: DiscoverProfilesParams): Promise<PaginatedResponse<DiscoverProfile>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.minAge) queryParams.append('min_age', params.minAge.toString());
    if (params?.maxAge) queryParams.append('max_age', params.maxAge.toString());
    if (params?.gender) queryParams.append('gender', params.gender);
    if (params?.location) queryParams.append('location', params.location);
    if (params?.lookingFor) queryParams.append('looking_for', params.lookingFor);

    const url = `/profiles/discover${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response: AxiosResponse = await apiClient.get(url);
    const data = response.data?.data ?? response.data;
    const items = data?.items ?? data?.profiles ?? data?.data ?? [];
    const pagination = data?.pagination ?? { page: 1, limit: 20, total: items.length, totalPages: 1 };
    return { data: items, pagination };
  }

  /**
   * Get all matches (mutual likes)
   */
  async getMatches(params?: GetMatchesParams): Promise<{ matches: Match[] } & { data?: Match[]; pagination?: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/profiles/matches${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response: AxiosResponse = await apiClient.get(url);
    const data = response.data?.data ?? response.data;
    const matches = Array.isArray(data?.matches) ? data.matches : (data?.items ?? data?.data ?? []);
    return { matches, data: matches, pagination: data?.pagination };
  }

  /**
   * Get likes (given or received)
   */
  async getLikes(params?: GetLikesParams): Promise<PaginatedResponse<Like>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);

    const url = `/profiles/likes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response: AxiosResponse = await apiClient.get(url);
    const data = response.data?.data ?? response.data;
    const items = data?.items ?? data?.likes ?? data?.data ?? [];
    const pagination = data?.pagination ?? { page: 1, limit: 20, total: items.length, totalPages: 1 };
    return { data: items, pagination };
  }
}

export const discoveryService = new DiscoveryService();
