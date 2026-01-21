// User Model
export interface User {
  userId: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  countryCode: string;
  verified: boolean;
  verificationDate?: string;
  lastActive?: string;
  isActive: boolean;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  createdAt: string;
}

// Profile Model
export interface Profile {
  profileId: string;
  userId: string;
  bio?: string;
  interests: string[];
  location?: string;
  lookingFor: 'DATING' | 'FRIENDSHIP' | 'HOBBY' | 'ALL';
  voiceBioUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileRequest {
  bio?: string;
  interests: string[];
  location?: string;
  lookingFor: 'dating' | 'friendship' | 'hobby' | 'all';
}

export interface UpdateProfileRequest {
  bio?: string;
  interests?: string[];
  location?: string;
  lookingFor?: 'dating' | 'friendship' | 'hobby' | 'all';
}

// Conversation Model
export interface Conversation {
  conversationId: string;
  userAId: string;
  userBId: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  otherUser?: Profile;
  lastMessage?: Message;
  unreadCount?: number;
}

// Message Model
export type MessageType = 'TEXT' | 'VOICE' | 'IMAGE' | 'FILE' | 'SYSTEM';

export interface MessageAttachment {
  attachmentId: string;
  messageId: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSize: number;
}

export interface MessageReaction {
  reactionId: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface Message {
  messageId: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  readAt?: string;
  deliveredAt?: string;
  editedAt?: string;
  deletedAt?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
}

export interface SendMessageRequest {
  recipientId: string;
  content: string;
  messageType?: MessageType;
}

export interface SendMessageResponse {
  messageId: string;
  conversationId: string;
  sentAt: string;
}

// Group Model
export interface Group {
  groupId: string;
  name: string;
  description?: string;
  creatorId: string;
  category: string;
  memberCount: number;
  isPublic: boolean;
  createdAt: string;
  isMember?: boolean;
  role?: 'MEMBER' | 'MODERATOR' | 'ADMIN';
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  category: string;
  isPublic: boolean;
}

export interface GroupMember {
  userId: string;
  profile: Profile;
  role: 'MEMBER' | 'MODERATOR' | 'ADMIN';
  joinedAt: string;
}

// Event Model
export interface Event {
  eventId: string;
  groupId?: string;
  creatorId: string;
  title: string;
  description?: string;
  dateTime: string;
  location: string;
  accessibilityNotes?: string;
  attendeeCount: number;
  createdAt: string;
  creator?: Profile;
  group?: Group;
}

export interface CreateEventRequest {
  groupId?: string;
  title: string;
  description?: string;
  dateTime: string;
  location: string;
  accessibilityNotes?: string;
}

export type RSVPStatus = 'going' | 'maybe' | 'not_going';

export interface EventRSVP {
  rsvpId: string;
  userId: string;
  eventId: string;
  status: RSVPStatus;
  createdAt: string;
  profile?: Profile;
}

export interface CreateRSVPRequest {
  status: RSVPStatus;
}

// Match Model
export interface Match {
  matchId: string;
  userAId: string;
  userBId: string;
  matchedAt: string;
  isActive: boolean;
  profile?: Profile;
}

export interface Like {
  likeId: string;
  userId: string;
  targetUserId: string;
  createdAt: string;
  profile?: Profile;
}

export interface LikeResponse {
  likeId: string;
  isMatch: boolean;
  matchId?: string;
}

// KYC Model
export type KYCMethod = 'document' | 'video_call' | 'referral';
export type KYCStatus = 'pending' | 'approved' | 'rejected';

export interface KYCVerification {
  verificationId: string;
  userId: string;
  method: KYCMethod;
  status: KYCStatus;
  uploadUrl?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface InitiateKYCRequest {
  method: KYCMethod;
}

export interface ScheduleCallRequest {
  preferredDate: string;
  preferredTime: string;
  timezone: string;
}

// Voice Call Model
export type CallStatus = 'INITIATED' | 'RINGING' | 'ANSWERED' | 'REJECTED' | 'MISSED' | 'ENDED' | 'CANCELLED';

export interface VoiceCall {
  callId: string;
  callerId: string;
  receiverId: string;
  status: CallStatus;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  twilioRoomSid?: string;
  createdAt: string;
  updatedAt: string;
  participantId?: string;
}

export interface InitiateCallRequest {
  receiverId: string;
}

export interface UpdateCallStatusRequest {
  status: CallStatus;
}

export interface WebRTCConfig {
  stunServers: Array<{ urls: string }>;
  turnServer?: string;
  turnUsername?: string;
  turnCredential?: string;
}

// Pagination
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

