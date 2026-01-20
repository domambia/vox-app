import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

// Extended Express Request with user
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    phoneNumber: string;
    verified: boolean;
  };
}

// JWT Payload
export interface JWTPayload extends JwtPayload {
  userId: string;
  phoneNumber: string;
  verified: boolean;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

// Pagination
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// File Upload
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

// User Types
export type LookingFor = 'dating' | 'friendship' | 'hobby' | 'all';
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';
export type GroupRole = 'member' | 'moderator' | 'admin';
export type KYCStatus = 'pending' | 'approved' | 'rejected';
export type KYCMethod = 'document' | 'video_call' | 'referral';
export type RSVPStatus = 'going' | 'maybe' | 'not_going';

