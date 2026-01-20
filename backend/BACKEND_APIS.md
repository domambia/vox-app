# Backend API Documentation

This document provides a comprehensive list of all APIs implemented in the VOX backend application.

**Base URL:** `/api/v1` (configurable via `API_VERSION` environment variable)

---

## Table of Contents

1. [Health Check APIs](#health-check-apis)
2. [Authentication APIs](#authentication-apis)
3. [Country APIs](#country-apis)
4. [Profile APIs](#profile-apis)
5. [Discovery APIs](#discovery-apis)
6. [KYC (Know Your Customer) APIs](#kyc-know-your-customer-apis)
7. [Group APIs](#group-apis)
8. [Event APIs](#event-apis)
9. [User APIs](#user-apis)
10. [Messaging APIs](#messaging-apis)
11. [Messages APIs](#messages-apis)
12. [Voice Call APIs](#voice-call-apis)
13. [Admin APIs](#admin-apis)
14. [File APIs](#file-apis)
15. [Swagger Documentation](#swagger-documentation)
16. [WebSocket Events](#websocket-events)

---

## Health Check APIs

### GET `/api/v1/health`
- **Description:** Health check endpoint - Returns the health status of the API and database connection
- **Access:** Public
- **Response:** 
  ```json
  {
    "success": true,
    "data": {
      "status": "healthy",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "uptime": 1234.56,
      "environment": "development",
      "database": "connected"
    }
  }
  ```

### GET `/api/v1/health/ready`
- **Description:** Readiness check - Checks if the service is ready to accept requests
- **Access:** Public
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "ready": true
    }
  }
  ```

### GET `/api/v1/health/live`
- **Description:** Liveness check - Checks if the service is alive
- **Access:** Public
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "alive": true
    }
  }
  ```

---

## Authentication APIs

### POST `/api/v1/auth/register`
- **Description:** Register a new user
- **Access:** Public
- **Rate Limited:** Yes (authLimiter)
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePass123!",
    "phone_number": "+1234567890",
    "country_code": "US"
  }
  ```
- **Response:** User object with tokens

### POST `/api/v1/auth/login`
- **Description:** Login user and get tokens
- **Access:** Public
- **Rate Limited:** Yes (authLimiter)
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePass123!"
  }
  ```
- **Response:** User object with access and refresh tokens

### POST `/api/v1/auth/refresh`
- **Description:** Refresh access token using refresh token
- **Access:** Public (requires valid refresh token)
- **Request Body:**
  ```json
  {
    "refresh_token": "refresh_token_string"
  }
  ```

### POST `/api/v1/auth/logout`
- **Description:** Logout user
- **Access:** Private (Authenticated)
- **Request Body:**
  ```json
  {
    "refresh_token": "refresh_token_string"
  }
  ```

### GET `/api/v1/auth/allowed-countries`
- **Description:** Get allowed countries for registration
- **Access:** Public
- **Response:** List of countries allowed for registration

### POST `/api/v1/auth/password-reset/request`
- **Description:** Request password reset
- **Access:** Public
- **Rate Limited:** Yes (authLimiter)
- **Request Body:**
  ```json
  {
    "email": "user@example.com"
  }
  ```

### POST `/api/v1/auth/password-reset/verify`
- **Description:** Verify password reset token
- **Access:** Public
- **Request Body:**
  ```json
  {
    "token": "reset_token_string"
  }
  ```

### POST `/api/v1/auth/password-reset/complete`
- **Description:** Complete password reset with new password
- **Access:** Public
- **Rate Limited:** Yes (authLimiter)
- **Request Body:**
  ```json
  {
    "token": "reset_token_string",
    "new_password": "NewSecurePass123!"
  }
  ```

### POST `/api/v1/auth/change-password`
- **Description:** Change password when authenticated
- **Access:** Private (Authenticated)
- **Request Body:**
  ```json
  {
    "current_password": "OldPass123!",
    "new_password": "NewSecurePass123!"
  }
  ```

---

## Country APIs

### GET `/api/v1/countries`
- **Description:** List all countries with pagination and filters
- **Access:** Public
- **Query Parameters:** page, limit, search, etc.

### GET `/api/v1/countries/allowed`
- **Description:** Get all allowed countries
- **Access:** Public
- **Response:** List of countries where registration is allowed

### GET `/api/v1/countries/stats`
- **Description:** Get country statistics
- **Access:** Public
- **Response:** Statistics about countries

### GET `/api/v1/countries/:code`
- **Description:** Get country by code
- **Access:** Public
- **Parameters:** `code` - Country code (e.g., "US", "GB")

### PATCH `/api/v1/countries/:code/allowed`
- **Description:** Update country allowed status
- **Access:** Private (Admin/Moderator - requires verification)
- **Parameters:** `code` - Country code
- **Request Body:**
  ```json
  {
    "is_allowed": true
  }
  ```

### PATCH `/api/v1/countries/bulk-allowed`
- **Description:** Bulk update countries allowed status
- **Access:** Private (Admin/Moderator - requires verification)
- **Request Body:**
  ```json
  {
    "country_codes": ["US", "GB", "CA"],
    "is_allowed": true
  }
  ```

---

## Profile APIs

### POST `/api/v1/profile`
- **Description:** Create a new profile
- **Access:** Private (Authenticated)
- **Request Body:**
  ```json
  {
    "display_name": "John Doe",
    "bio": "A brief bio about me",
    "date_of_birth": "1990-01-01",
    "gender": "male",
    "location": "New York, NY"
  }
  ```

### GET `/api/v1/profile/me`
- **Description:** Get current user's profile
- **Access:** Private (Authenticated)
- **Response:** Current user's profile data

### GET `/api/v1/profile/:userId`
- **Description:** Get profile by user ID
- **Access:** Private (Authenticated)
- **Parameters:** `userId` - User ID

### PUT `/api/v1/profile/:userId`
- **Description:** Update profile
- **Access:** Private (Authenticated, own profile only)
- **Parameters:** `userId` - User ID
- **Request Body:** Profile update fields

### DELETE `/api/v1/profile/:userId`
- **Description:** Delete profile
- **Access:** Private (Authenticated, own profile only)
- **Parameters:** `userId` - User ID

### POST `/api/v1/profile/voice-bio`
- **Description:** Upload voice bio
- **Access:** Private (Authenticated)
- **Content-Type:** multipart/form-data
- **Body:** File upload (audio file)

### DELETE `/api/v1/profile/voice-bio`
- **Description:** Delete voice bio
- **Access:** Private (Authenticated)

### POST `/api/v1/profile/:userId/like`
- **Description:** Like a profile
- **Access:** Private (Authenticated)
- **Parameters:** `userId` - User ID to like

### DELETE `/api/v1/profile/:userId/like`
- **Description:** Unlike a profile
- **Access:** Private (Authenticated)
- **Parameters:** `userId` - User ID to unlike

---

## Discovery APIs

### GET `/api/v1/profiles/discover`
- **Description:** Discover profile suggestions
- **Access:** Private (Authenticated)
- **Query Parameters:** page, limit, filters (age, gender, location, etc.)

### GET `/api/v1/profiles/matches`
- **Description:** Get all matches (mutual likes)
- **Access:** Private (Authenticated)
- **Query Parameters:** page, limit

### GET `/api/v1/profiles/likes`
- **Description:** Get likes (given or received)
- **Access:** Private (Authenticated)
- **Query Parameters:** page, limit, type (given/received)

---

## KYC (Know Your Customer) APIs

### POST `/api/v1/kyc/initiate`
- **Description:** Initiate KYC verification process
- **Access:** Private (Authenticated)
- **Request Body:**
  ```json
  {
    "document_type": "passport",
    "country": "US"
  }
  ```

### POST `/api/v1/kyc/upload-document`
- **Description:** Upload verification document
- **Access:** Private (Authenticated)
- **Content-Type:** multipart/form-data
- **Body:** File upload (document image/PDF)

### POST `/api/v1/kyc/schedule-call`
- **Description:** Schedule video call verification
- **Access:** Private (Authenticated)
- **Request Body:**
  ```json
  {
    "scheduled_at": "2024-01-15T10:00:00Z",
    "timezone": "America/New_York"
  }
  ```

### GET `/api/v1/kyc/status`
- **Description:** Get verification status
- **Access:** Private (Authenticated)
- **Response:** Current KYC verification status

### GET `/api/v1/kyc/history`
- **Description:** Get verification history
- **Access:** Private (Authenticated)
- **Response:** List of all verification attempts

### GET `/api/v1/kyc/pending`
- **Description:** Get pending verifications (admin/moderator only)
- **Access:** Private (Authenticated, Verified)
- **Query Parameters:** page, limit, status

### POST `/api/v1/kyc/:verificationId/approve`
- **Description:** Approve verification (admin/moderator only)
- **Access:** Private (Authenticated, Verified)
- **Parameters:** `verificationId` - Verification ID
- **Request Body:**
  ```json
  {
    "notes": "Verification approved"
  }
  ```

### POST `/api/v1/kyc/:verificationId/reject`
- **Description:** Reject verification (admin/moderator only)
- **Access:** Private (Authenticated, Verified)
- **Parameters:** `verificationId` - Verification ID
- **Request Body:**
  ```json
  {
    "reason": "Document unclear",
    "notes": "Please resubmit with clearer image"
  }
  ```

---

## Group APIs

### POST `/api/v1/groups`
- **Description:** Create a new group
- **Access:** Private (Authenticated)
- **Request Body:**
  ```json
  {
    "name": "Group Name",
    "description": "Group description",
    "is_private": false,
    "max_members": 100
  }
  ```

### GET `/api/v1/groups`
- **Description:** List groups with filters
- **Access:** Private (Authenticated)
- **Query Parameters:** page, limit, search, is_private, etc.

### GET `/api/v1/groups/:groupId`
- **Description:** Get group by ID
- **Access:** Private (Authenticated)
- **Parameters:** `groupId` - Group ID

### PUT `/api/v1/groups/:groupId`
- **Description:** Update group (admin only)
- **Access:** Private (Authenticated, Group Admin)
- **Parameters:** `groupId` - Group ID
- **Request Body:** Group update fields

### DELETE `/api/v1/groups/:groupId`
- **Description:** Delete group (admin only)
- **Access:** Private (Authenticated, Group Admin)
- **Parameters:** `groupId` - Group ID

### POST `/api/v1/groups/:groupId/join`
- **Description:** Join a group
- **Access:** Private (Authenticated)
- **Parameters:** `groupId` - Group ID

### POST `/api/v1/groups/:groupId/leave`
- **Description:** Leave a group
- **Access:** Private (Authenticated)
- **Parameters:** `groupId` - Group ID

### GET `/api/v1/groups/:groupId/members`
- **Description:** Get group members
- **Access:** Private (Authenticated)
- **Parameters:** `groupId` - Group ID
- **Query Parameters:** page, limit, role

### PUT `/api/v1/groups/:groupId/members/:memberId/role`
- **Description:** Update member role (admin only)
- **Access:** Private (Authenticated, Group Admin)
- **Parameters:** 
  - `groupId` - Group ID
  - `memberId` - Member User ID
- **Request Body:**
  ```json
  {
    "role": "moderator"
  }
  ```

### DELETE `/api/v1/groups/:groupId/members/:memberId`
- **Description:** Remove member from group (admin/moderator only)
- **Access:** Private (Authenticated, Group Admin/Moderator)
- **Parameters:** 
  - `groupId` - Group ID
  - `memberId` - Member User ID

### GET `/api/v1/groups/:groupId/events`
- **Description:** Get group events
- **Access:** Private (Authenticated)
- **Parameters:** `groupId` - Group ID
- **Query Parameters:** page, limit, status

---

## Event APIs

### POST `/api/v1/events`
- **Description:** Create a new event
- **Access:** Private (Authenticated)
- **Request Body:**
  ```json
  {
    "title": "Event Title",
    "description": "Event description",
    "start_time": "2024-01-15T10:00:00Z",
    "end_time": "2024-01-15T12:00:00Z",
    "location": "Event Location",
    "group_id": "group_id_optional",
    "max_attendees": 50
  }
  ```

### GET `/api/v1/events`
- **Description:** List events with filters
- **Access:** Private (Authenticated)
- **Query Parameters:** page, limit, status, group_id, date_from, date_to

### GET `/api/v1/events/:eventId`
- **Description:** Get event by ID
- **Access:** Private (Authenticated)
- **Parameters:** `eventId` - Event ID

### PUT `/api/v1/events/:eventId`
- **Description:** Update event (creator/admin only)
- **Access:** Private (Authenticated, Event Creator/Admin)
- **Parameters:** `eventId` - Event ID
- **Request Body:** Event update fields

### DELETE `/api/v1/events/:eventId`
- **Description:** Delete event (creator/admin only)
- **Access:** Private (Authenticated, Event Creator/Admin)
- **Parameters:** `eventId` - Event ID

### POST `/api/v1/events/:eventId/rsvp`
- **Description:** RSVP to an event
- **Access:** Private (Authenticated)
- **Parameters:** `eventId` - Event ID
- **Request Body:**
  ```json
  {
    "status": "going"
  }
  ```
- **Status values:** going, maybe, not_going

### GET `/api/v1/events/:eventId/rsvps`
- **Description:** Get event RSVPs
- **Access:** Private (Authenticated)
- **Parameters:** `eventId` - Event ID
- **Query Parameters:** page, limit, status

---

## User APIs

### GET `/api/v1/users/:userId/groups`
- **Description:** Get user's groups
- **Access:** Private (Authenticated, own groups only)
- **Parameters:** `userId` - User ID
- **Query Parameters:** page, limit

### GET `/api/v1/users/:userId/events`
- **Description:** Get user's events
- **Access:** Private (Authenticated, own events only)
- **Parameters:** `userId` - User ID
- **Query Parameters:** page, limit, status

---

## Messaging APIs

### POST `/api/v1/messages`
- **Description:** Send a message
- **Access:** Private (Authenticated)
- **Request Body:**
  ```json
  {
    "recipient_id": "user_id",
    "content": "Message content",
    "message_type": "TEXT"
  }
  ```

### GET `/api/v1/conversations`
- **Description:** List user's conversations
- **Access:** Private (Authenticated)
- **Query Parameters:** page, limit

### GET `/api/v1/conversations/:conversationId`
- **Description:** Get conversation details
- **Access:** Private (Authenticated)
- **Parameters:** `conversationId` - Conversation ID

### GET `/api/v1/conversations/:conversationId/messages`
- **Description:** Get messages for a conversation
- **Access:** Private (Authenticated)
- **Parameters:** `conversationId` - Conversation ID
- **Query Parameters:** page, limit, before (timestamp)

### POST `/api/v1/conversations/:conversationId/read`
- **Description:** Mark messages as read
- **Access:** Private (Authenticated)
- **Parameters:** `conversationId` - Conversation ID
- **Request Body:**
  ```json
  {
    "message_ids": ["message_id_1", "message_id_2"]
  }
  ```

### DELETE `/api/v1/conversations/:conversationId`
- **Description:** Delete conversation
- **Access:** Private (Authenticated)
- **Parameters:** `conversationId` - Conversation ID

---

## Messages APIs

### POST `/api/v1/messages`
- **Description:** Send a message (duplicate endpoint - same as messaging)
- **Access:** Private (Authenticated)
- **Request Body:**
  ```json
  {
    "recipient_id": "user_id",
    "content": "Message content",
    "message_type": "TEXT"
  }
  ```

### PUT `/api/v1/messages/:messageId`
- **Description:** Edit a message
- **Access:** Private (Authenticated, message sender only)
- **Parameters:** `messageId` - Message ID
- **Request Body:**
  ```json
  {
    "content": "Updated message content"
  }
  ```

### DELETE `/api/v1/messages/:messageId`
- **Description:** Delete a message
- **Access:** Private (Authenticated, message sender only)
- **Parameters:** `messageId` - Message ID

### POST `/api/v1/messages/:messageId/reactions`
- **Description:** Add reaction to a message
- **Access:** Private (Authenticated)
- **Parameters:** `messageId` - Message ID
- **Request Body:**
  ```json
  {
    "emoji": "👍"
  }
  ```

### DELETE `/api/v1/messages/:messageId/reactions`
- **Description:** Remove reaction from a message
- **Access:** Private (Authenticated)
- **Parameters:** `messageId` - Message ID

### GET `/api/v1/messages/search`
- **Description:** Search messages
- **Access:** Private (Authenticated)
- **Query Parameters:** q (search query), conversation_id, page, limit

### POST `/api/v1/messages/:messageId/delivered`
- **Description:** Mark message as delivered
- **Access:** Private (Authenticated)
- **Parameters:** `messageId` - Message ID

### POST `/api/v1/messages/attachments`
- **Description:** Upload message attachment
- **Access:** Private (Authenticated)
- **Content-Type:** multipart/form-data
- **Body:** File upload

### GET `/api/v1/messages/unread-count`
- **Description:** Get unread message count
- **Access:** Private (Authenticated)
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "unread_count": 5
    }
  }
  ```

---

## Voice Call APIs

### POST `/api/v1/calls/initiate`
- **Description:** Initiate a voice call
- **Access:** Private (Authenticated)
- **Request Body:**
  ```json
  {
    "receiver_id": "user_id"
  }
  ```

### PUT `/api/v1/calls/:callId/status`
- **Description:** Update call status
- **Access:** Private (Authenticated)
- **Parameters:** `callId` - Call ID
- **Request Body:**
  ```json
  {
    "status": "ANSWERED"
  }
  ```
- **Status values:** PENDING, ANSWERED, REJECTED, ENDED, MISSED

### POST `/api/v1/calls/:callId/end`
- **Description:** End a call
- **Access:** Private (Authenticated)
- **Parameters:** `callId` - Call ID

### GET `/api/v1/calls/history`
- **Description:** Get call history
- **Access:** Private (Authenticated)
- **Query Parameters:** page, limit, status, date_from, date_to

### GET `/api/v1/calls/:callId`
- **Description:** Get call by ID
- **Access:** Private (Authenticated)
- **Parameters:** `callId` - Call ID

### GET `/api/v1/calls/webrtc-config`
- **Description:** Get WebRTC configuration (STUN/TURN servers)
- **Access:** Private (Authenticated)
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "stun_servers": ["stun:stun.l.google.com:19302"],
      "turn_server": "turn:turn.example.com:3478",
      "turn_username": "username",
      "turn_credential": "credential"
    }
  }
  ```

### GET `/api/v1/calls/:callId/room`
- **Description:** Get call room name for WebRTC signaling
- **Access:** Private (Authenticated)
- **Parameters:** `callId` - Call ID
- **Response:** Room name for WebRTC signaling

---

## Admin APIs

All admin routes require authentication and appropriate role (Admin or Moderator).

### GET `/api/v1/admin/users`
- **Description:** List all users (admin only)
- **Access:** Private (Admin)
- **Query Parameters:** page, limit, search, status, role

### GET `/api/v1/admin/users/:userId`
- **Description:** Get user details (admin only)
- **Access:** Private (Admin)
- **Parameters:** `userId` - User ID

### PUT `/api/v1/admin/users/:userId/status`
- **Description:** Update user status (admin only)
- **Access:** Private (Admin)
- **Parameters:** `userId` - User ID
- **Request Body:**
  ```json
  {
    "is_active": true,
    "is_verified": true
  }
  ```

### GET `/api/v1/admin/kyc/queue`
- **Description:** Get KYC verification queue (moderator/admin)
- **Access:** Private (Moderator/Admin)
- **Query Parameters:** page, limit, status

### GET `/api/v1/admin/stats`
- **Description:** Get platform statistics (admin only)
- **Access:** Private (Admin)
- **Response:** Platform statistics (user counts, verification stats, etc.)

### GET `/api/v1/admin/moderation/queue`
- **Description:** Get moderation queue (moderator/admin)
- **Access:** Private (Moderator/Admin)
- **Query Parameters:** page, limit, type

---

## File APIs

### GET `/api/v1/files/:fileType/:filename`
- **Description:** Serve uploaded files (protected route)
- **Access:** Private (Authenticated)
- **Parameters:** 
  - `fileType` - Type of file (profiles, kyc, voice-bios, events)
  - `filename` - Name of the file
- **Allowed file types:** profiles, kyc, voice-bios, events

**Note:** Files are also served statically at `/api/v1/files` (configured in app.ts)

---

## Swagger Documentation

### GET `/api-docs`
- **Description:** Swagger UI documentation interface
- **Access:** Public
- **Response:** HTML page with interactive API documentation

### GET `/api-docs/json`
- **Description:** Swagger JSON specification
- **Access:** Public
- **Response:** OpenAPI/Swagger JSON specification

---

## WebSocket Events

The backend implements a WebSocket server for real-time communication. All WebSocket connections require authentication via token.

### Connection
- **Authentication:** Token-based (via `auth.token` or `Authorization` header)
- **Room:** Users automatically join `user:{userId}` room

### Client → Server Events

#### Messaging Events

**`message:send`**
- **Description:** Send a message
- **Data:**
  ```json
  {
    "recipientId": "user_id",
    "content": "Message content",
    "messageType": "TEXT"
  }
  ```

**`message:edit`**
- **Description:** Edit a message
- **Data:**
  ```json
  {
    "messageId": "message_id",
    "content": "Updated content"
  }
  ```

**`message:delete`**
- **Description:** Delete a message
- **Data:**
  ```json
  {
    "messageId": "message_id"
  }
  ```

**`message:read`**
- **Description:** Mark messages as read
- **Data:**
  ```json
  {
    "conversationId": "conversation_id",
    "messageIds": ["message_id_1", "message_id_2"]
  }
  ```

**`typing:start`**
- **Description:** Start typing indicator
- **Data:**
  ```json
  {
    "conversationId": "conversation_id",
    "recipientId": "user_id"
  }
  ```

**`typing:stop`**
- **Description:** Stop typing indicator
- **Data:**
  ```json
  {
    "conversationId": "conversation_id",
    "recipientId": "user_id"
  }
  ```

**`reaction:add`**
- **Description:** Add reaction to a message
- **Data:**
  ```json
  {
    "messageId": "message_id",
    "emoji": "👍"
  }
  ```

**`reaction:remove`**
- **Description:** Remove reaction from a message
- **Data:**
  ```json
  {
    "messageId": "message_id"
  }
  ```

#### Voice Call Events

**`call:initiate`**
- **Description:** Initiate a voice call
- **Data:**
  ```json
  {
    "receiverId": "user_id"
  }
  ```

**`call:answer`**
- **Description:** Answer an incoming call
- **Data:**
  ```json
  {
    "callId": "call_id"
  }
  ```

**`call:reject`**
- **Description:** Reject an incoming call
- **Data:**
  ```json
  {
    "callId": "call_id"
  }
  ```

**`call:end`**
- **Description:** End an active call
- **Data:**
  ```json
  {
    "callId": "call_id"
  }
  ```

**`call:status`**
- **Description:** Update call status
- **Data:**
  ```json
  {
    "callId": "call_id",
    "status": "ANSWERED"
  }
  ```

#### WebRTC Signaling Events

**`webrtc:offer`**
- **Description:** Send WebRTC offer (caller → receiver)
- **Data:**
  ```json
  {
    "callId": "call_id",
    "offer": {
      "type": "offer",
      "sdp": "sdp_string"
    }
  }
  ```

**`webrtc:answer`**
- **Description:** Send WebRTC answer (receiver → caller)
- **Data:**
  ```json
  {
    "callId": "call_id",
    "answer": {
      "type": "answer",
      "sdp": "sdp_string"
    }
  }
  ```

**`webrtc:ice-candidate`**
- **Description:** Send ICE candidate
- **Data:**
  ```json
  {
    "callId": "call_id",
    "candidate": {
      "candidate": "candidate_string",
      "sdpMLineIndex": 0,
      "sdpMid": "0"
    }
  }
  ```

### Server → Client Events

#### Messaging Events

**`message:sent`**
- **Description:** Confirmation that message was sent
- **Data:**
  ```json
  {
    "message_id": "message_id",
    "conversation_id": "conversation_id",
    "content": "Message content",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
  ```

**`message:received`**
- **Description:** New message received
- **Data:**
  ```json
  {
    "message_id": "message_id",
    "conversation_id": "conversation_id",
    "sender_id": "user_id",
    "content": "Message content",
    "message_type": "TEXT",
    "delivered_at": "2024-01-01T00:00:00.000Z",
    "created_at": "2024-01-01T00:00:00.000Z",
    "attachments": []
  }
  ```

**`message:edited`**
- **Description:** Message was edited
- **Data:**
  ```json
  {
    "message_id": "message_id",
    "conversation_id": "conversation_id",
    "content": "Updated content",
    "edited_at": "2024-01-01T00:00:00.000Z"
  }
  ```

**`message:deleted`**
- **Description:** Message was deleted
- **Data:**
  ```json
  {
    "message_id": "message_id",
    "conversation_id": "conversation_id"
  }
  ```

**`message:read:confirmed`**
- **Description:** Confirmation that messages were marked as read
- **Data:**
  ```json
  {
    "conversation_id": "conversation_id"
  }
  ```

**`message:read_receipt`**
- **Description:** Notification that messages were read by other user
- **Data:**
  ```json
  {
    "conversation_id": "conversation_id",
    "read_by": "user_id"
  }
  ```

**`typing:indicator`**
- **Description:** Typing indicator update
- **Data:**
  ```json
  {
    "conversation_id": "conversation_id",
    "user_id": "user_id",
    "is_typing": true
  }
  ```

**`reaction:added`**
- **Description:** Reaction was added to a message
- **Data:**
  ```json
  {
    "reaction_id": "reaction_id",
    "message_id": "message_id",
    "emoji": "👍",
    "user": { "user_id": "user_id", "display_name": "User Name" }
  }
  ```

**`reaction:removed`**
- **Description:** Reaction was removed from a message
- **Data:**
  ```json
  {
    "message_id": "message_id",
    "user_id": "user_id"
  }
  ```

**`message:error`**
- **Description:** Error occurred with messaging operation
- **Data:**
  ```json
  {
    "error": "Error message"
  }
  ```

#### Voice Call Events

**`call:initiated`**
- **Description:** Call was initiated
- **Data:**
  ```json
  {
    "call_id": "call_id",
    "receiver_id": "user_id",
    "status": "PENDING",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
  ```

**`call:incoming`**
- **Description:** Incoming call notification
- **Data:**
  ```json
  {
    "call_id": "call_id",
    "caller_id": "user_id",
    "caller": { "user_id": "user_id", "display_name": "User Name" },
    "created_at": "2024-01-01T00:00:00.000Z"
  }
  ```

**`call:answered`**
- **Description:** Call was answered
- **Data:**
  ```json
  {
    "call_id": "call_id",
    "receiver_id": "user_id"
  }
  ```

**`call:answered:confirmed`**
- **Description:** Confirmation that call was answered
- **Data:**
  ```json
  {
    "call_id": "call_id"
  }
  ```

**`call:rejected`**
- **Description:** Call was rejected
- **Data:**
  ```json
  {
    "call_id": "call_id",
    "receiver_id": "user_id"
  }
  ```

**`call:rejected:confirmed`**
- **Description:** Confirmation that call was rejected
- **Data:**
  ```json
  {
    "call_id": "call_id"
  }
  ```

**`call:ended`**
- **Description:** Call was ended
- **Data:**
  ```json
  {
    "call_id": "call_id",
    "ended_by": "user_id",
    "duration": 120
  }
  ```

**`call:ended:confirmed`**
- **Description:** Confirmation that call was ended
- **Data:**
  ```json
  {
    "call_id": "call_id"
  }
  ```

**`call:status:updated`**
- **Description:** Call status was updated
- **Data:**
  ```json
  {
    "call_id": "call_id",
    "status": "ANSWERED"
  }
  ```

**`call:status:confirmed`**
- **Description:** Confirmation that call status was updated
- **Data:**
  ```json
  {
    "call_id": "call_id",
    "status": "ANSWERED"
  }
  ```

**`call:error`**
- **Description:** Error occurred with call operation
- **Data:**
  ```json
  {
    "error": "Error message"
  }
  ```

#### WebRTC Signaling Events

**`webrtc:offer`**
- **Description:** WebRTC offer received
- **Data:**
  ```json
  {
    "call_id": "call_id",
    "offer": {
      "type": "offer",
      "sdp": "sdp_string"
    },
    "caller_id": "user_id"
  }
  ```

**`webrtc:answer`**
- **Description:** WebRTC answer received
- **Data:**
  ```json
  {
    "call_id": "call_id",
    "answer": {
      "type": "answer",
      "sdp": "sdp_string"
    },
    "receiver_id": "user_id"
  }
  ```

**`webrtc:ice-candidate`**
- **Description:** WebRTC ICE candidate received
- **Data:**
  ```json
  {
    "call_id": "call_id",
    "candidate": {
      "candidate": "candidate_string",
      "sdpMLineIndex": 0,
      "sdpMid": "0"
    },
    "from_user_id": "user_id"
  }
  ```

---

## Authentication & Authorization

### Authentication Methods

1. **Bearer Token (JWT)**
   - Most endpoints require a Bearer token in the `Authorization` header
   - Format: `Authorization: Bearer <access_token>`

2. **WebSocket Authentication**
   - Token passed via `auth.token` in handshake or `Authorization` header
   - Format: `Bearer <access_token>`

### Access Levels

- **Public:** No authentication required
- **Private (Authenticated):** Requires valid JWT token
- **Private (Verified):** Requires authentication + user verification
- **Private (Admin):** Requires authentication + admin role
- **Private (Moderator/Admin):** Requires authentication + moderator or admin role

---

## Rate Limiting

- **General Rate Limiter:** Applied to all routes (default: 100 requests per minute)
- **Auth Rate Limiter:** Applied to authentication endpoints (stricter limits)

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Pagination is available on list endpoints (default: page=1, limit=10)
- File uploads have a maximum size limit (default: 10MB)
- WebSocket server runs on the same port as the HTTP server
- CORS is configured and can be customized via environment variables

---

**Last Updated:** Generated from codebase review
**API Version:** v1 (configurable)

