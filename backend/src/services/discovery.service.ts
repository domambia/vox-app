import prisma from "@/config/database";
import { logger } from "@/utils/logger";
import { Prisma, LookingFor } from "@prisma/client";
import { config } from "@/config/env";
import {
  normalizePagination,
  createPaginatedResponse,
  getPaginationMetadata,
} from "@/utils/pagination";

export interface DiscoverProfilesParams {
  userId: string;
  limit?: number;
  offset?: number;
  location?: string;
  lookingFor?: string;
  minInterests?: number; // Minimum number of common interests
}

export interface ProfileSuggestion {
  profile_id: string;
  user_id: string;
  bio: string | null;
  interests: string[];
  location: string | null;
  looking_for: LookingFor;
  voice_bio_url: string | null;
  created_at: Date;
  updated_at: Date;
  user: {
    user_id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    verified: boolean;
    created_at: Date;
  };
  matchScore: number;
}

export class DiscoveryService {
  /**
   * Calculate match score between two profiles
   * Factors:
   * - Common interests (40% weight)
   * - Location match (30% weight)
   * - Looking for alignment (20% weight)
   * - Activity level (10% weight - based on profile age)
   */
  private calculateMatchScore(
    profile1: {
      interests: any;
      location: string | null;
      looking_for: string;
      created_at: Date;
    },
    profile2: {
      interests: any;
      location: string | null;
      looking_for: string;
      created_at: Date;
    },
  ): number {
    let score = 0;

    // 1. Common interests (40% weight)
    const interests1 = Array.isArray(profile1.interests)
      ? profile1.interests
      : [];
    const interests2 = Array.isArray(profile2.interests)
      ? profile2.interests
      : [];
    const commonInterests = interests1.filter((interest: string) =>
      interests2.includes(interest),
    );
    const interestScore =
      interests1.length > 0 && interests2.length > 0
        ? (commonInterests.length /
            Math.max(interests1.length, interests2.length)) *
          0.4
        : 0;
    score += interestScore;

    // 2. Location match (30% weight)
    if (profile1.location && profile2.location) {
      const location1 = profile1.location.toLowerCase().trim();
      const location2 = profile2.location.toLowerCase().trim();
      if (location1 === location2) {
        score += 0.3;
      } else if (
        location1.includes(location2) ||
        location2.includes(location1)
      ) {
        score += 0.15; // Partial match
      }
    }

    // 3. Looking for alignment (20% weight)
    const lookingFor1 = profile1.looking_for;
    const lookingFor2 = profile2.looking_for;
    if (lookingFor1 === "ALL" || lookingFor2 === "ALL") {
      score += 0.2;
    } else if (lookingFor1 === lookingFor2) {
      score += 0.2;
    } else {
      // Some compatibility (e.g., FRIENDSHIP and HOBBY)
      const compatiblePairs = [
        ["FRIENDSHIP", "HOBBY"],
        ["DATING", "FRIENDSHIP"],
      ];
      const isCompatible = compatiblePairs.some(
        (pair) => pair.includes(lookingFor1) && pair.includes(lookingFor2),
      );
      if (isCompatible) {
        score += 0.1;
      }
    }

    // 4. Activity level (10% weight) - based on profile recency
    const profileAge = Date.now() - new Date(profile2.created_at).getTime();
    const daysSinceCreation = profileAge / (1000 * 60 * 60 * 24);
    // Newer profiles get higher score (max 30 days)
    const activityScore = Math.max(0, 1 - daysSinceCreation / 30) * 0.1;
    score += activityScore;

    return Math.min(1, score); // Cap at 1.0
  }

  /**
   * Get profile suggestions for discovery
   */
  async discoverProfiles(params: DiscoverProfilesParams) {
    try {
      const { limit, offset } = normalizePagination(
        params.limit,
        params.offset,
      );
      const { userId, location, lookingFor, minInterests } = params;

      // Get user's profile
      const userProfile = await prisma.profile.findUnique({
        where: { user_id: userId },
      });

      if (!userProfile) {
        throw new Error("Profile not found. Please create a profile first.");
      }

      // Get user's interests
      const userInterests = Array.isArray(userProfile.interests)
        ? (userProfile.interests as string[])
        : [];

      // Build where clause
      const where: Prisma.ProfileWhereInput = {
        user_id: { not: userId }, // Exclude self
        user: {
          is_active: true,
        },
      };

      // Only show verified users in production. In development/test, allow unverified accounts
      // to prevent empty discovery lists when seeding/registering locally.
      if (config.nodeEnv === "production") {
        where.user = {
          ...(where.user as Prisma.UserWhereInput),
          verified: true,
        };
      }

      // Location filter
      if (location) {
        where.location = {
          contains: location,
          mode: "insensitive",
        };
      }

      // Looking for filter
      if (lookingFor && lookingFor !== "ALL") {
        where.OR = [
          { looking_for: lookingFor as LookingFor },
          { looking_for: "ALL" },
        ];
      }

      // Get all potential profiles
      const allProfiles = await prisma.profile.findMany({
        where,
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

      // Get user's likes and matches to exclude
      const [likesGiven, matches] = await Promise.all([
        prisma.like.findMany({
          where: { liker_id: userId },
          select: { liked_id: true },
        }),
        prisma.match.findMany({
          where: {
            OR: [{ user_a_id: userId }, { user_b_id: userId }],
            is_active: true,
          },
          select: {
            user_a_id: true,
            user_b_id: true,
          },
        }),
      ]);

      const excludedUserIds = new Set<string>();
      likesGiven.forEach((like) => excludedUserIds.add(like.liked_id));
      matches.forEach((match) => {
        excludedUserIds.add(match.user_a_id);
        excludedUserIds.add(match.user_b_id);
      });

      // Filter out excluded users and calculate match scores
      const profilesWithScores: ProfileSuggestion[] = allProfiles
        .filter((profile) => !excludedUserIds.has(profile.user_id))
        .map((profile) => {
          const matchScore = this.calculateMatchScore(userProfile, profile);

          // Filter by minimum common interests if specified
          if (minInterests && minInterests > 0) {
            const profileInterests = Array.isArray(profile.interests)
              ? (profile.interests as string[])
              : [];
            const commonInterests = userInterests.filter((interest) =>
              profileInterests.includes(interest),
            );
            if (commonInterests.length < minInterests) {
              return null;
            }
          }

          return {
            profile_id: profile.profile_id,
            user_id: profile.user_id,
            bio: profile.bio,
            interests: Array.isArray(profile.interests)
              ? (profile.interests as string[])
              : [],
            location: profile.location,
            looking_for: profile.looking_for,
            voice_bio_url: profile.voice_bio_url,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            user: {
              user_id: profile.user.user_id,
              first_name: profile.user.first_name,
              last_name: profile.user.last_name,
              phone_number: profile.user.phone_number,
              verified: profile.user.verified,
              created_at: profile.user.created_at,
            },
            matchScore,
          };
        })
        .filter((profile): profile is ProfileSuggestion => profile !== null)
        .sort((a, b) => b.matchScore - a.matchScore); // Sort by match score descending

      // Apply pagination
      const total = profilesWithScores.length;
      const paginatedProfiles = profilesWithScores.slice(
        offset,
        offset + limit,
      );

      const pagination = getPaginationMetadata(total, limit, offset);

      logger.info("Profiles discovered", {
        userId,
        total,
        returned: paginatedProfiles.length,
        limit,
        offset,
      });

      return {
        ...createPaginatedResponse(paginatedProfiles, total, limit, offset),
        pagination,
      };
    } catch (error) {
      logger.error("Error discovering profiles", error);
      throw error;
    }
  }

  /**
   * Get random profile suggestions (for when user has no preferences)
   */
  async getRandomSuggestions(userId: string, limit: number = 20) {
    try {
      const profiles = await prisma.profile.findMany({
        where: {
          user_id: { not: userId },
          user: {
            verified: true,
            is_active: true,
          },
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
        take: limit,
        orderBy: {
          created_at: "desc",
        },
      });

      return profiles.map((profile) => ({
        ...profile,
        interests: Array.isArray(profile.interests) ? profile.interests : [],
        matchScore: 0.5, // Default score for random suggestions
      }));
    } catch (error) {
      logger.error("Error getting random suggestions", error);
      throw error;
    }
  }
}

// Export singleton instance
const discoveryService = new DiscoveryService();
export default discoveryService;
