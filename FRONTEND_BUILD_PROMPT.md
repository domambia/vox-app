# VOX React Native Frontend Development Prompt

## Project Overview

VOX is a community platform exclusively designed for blind and visually impaired people. The backend API is fully implemented and ready. You need to build a complete React Native mobile application (iOS and Android) that connects to this backend.

**Mission:** Connect blind and visually impaired people through community, not technology. Every feature must be accessible to screen reader users from day one.

**Key Principles:**
- Accessibility is the foundation, not an afterthought
- All UI must work with VoiceOver (iOS) and TalkBack (Android)
- Test with actual screen readers, not just automated tools
- Offline-first architecture for poor connectivity scenarios
- Real-time messaging via WebSocket/Socket.IO

---

## Technology Stack Requirements

### Core Technologies
- **Framework:** React Native with Expo (managed workflow)
- **Language:** TypeScript
- **State Management:** Redux Toolkit or Zustand
- **Navigation:** React Navigation v6
- **HTTP Client:** Axios with interceptors
- **WebSocket:** Socket.IO Client
- **Form Handling:** React Hook Form
- **Offline Storage:** AsyncStorage + Redux Persist
- **Voice Recording:** expo-av or react-native-voice
- **WebRTC:** react-native-webrtc (for voice calls)
- **Push Notifications:** expo-notifications
- **File Upload:** expo-image-picker, expo-document-picker

### Accessibility Libraries
- React Native Accessibility API
- AccessibilityInfo from React Native
- Custom accessibility hooks and utilities

---

## Backend API Information

### Base URL
- **Development:** `http://localhost:3000/api/v1`
- **Production:** Configure via environment variables

### Authentication
All authenticated endpoints require JWT token in header:
```
Authorization: Bearer <access_token>
```

### API Response Format
```typescript
// Success Response
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-19T12:00:00Z",
    "requestId": "uuid"
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2025-01-19T12:00:00Z",
    "requestId": "uuid"
  }
}
```

### API Endpoints

#### Authentication (`/api/v1/auth`)
- `POST /register` - Register new user
  - Body: `{ phoneNumber, password, firstName, lastName, email?, countryCode }`
  - Response: `{ userId, phoneNumber, requiresVerification: true }`
  
- `POST /login` - Login user
  - Body: `{ phoneNumber, password }`
  - Response: `{ token, refreshToken, expiresIn, user: { userId, verified } }`
  
- `POST /refresh` - Refresh access token
  - Headers: `Authorization: Bearer <refresh_token>`
  - Response: `{ token, expiresIn }`
  
- `POST /logout` - Logout user
  - Headers: `Authorization: Bearer <token>`
  
- `GET /allowed-countries` - Get allowed countries for registration
  - Response: `{ countries: [{ code, name, is_allowed }] }`
  
- `POST /password-reset/request` - Request password reset
- `POST /password-reset/verify` - Verify reset token
- `POST /password-reset/complete` - Complete password reset
- `POST /change-password` - Change password (authenticated)

#### Profile (`/api/v1/profile`)
- `POST /` - Create profile
  - Body: `{ bio?, interests: string[], location?, lookingFor: 'dating'|'friendship'|'hobby'|'all' }`
  
- `GET /me` - Get current user's profile
  - Response: `{ profileId, userId, bio, interests, location, lookingFor, voiceBioUrl?, createdAt }`
  
- `GET /:userId` - Get profile by user ID
  
- `PUT /:userId` - Update profile
  - Body: `{ bio?, interests?, location?, lookingFor? }`
  
- `DELETE /:userId` - Delete profile
  
- `POST /voice-bio` - Upload voice bio (multipart/form-data)
  - File field: `voiceBio`
  
- `DELETE /voice-bio` - Delete voice bio
  
- `POST /:userId/like` - Like a profile
  - Response: `{ likeId, isMatch: boolean, matchId? }`
  
- `DELETE /:userId/like` - Unlike a profile

#### Discovery (`/api/v1/profiles`)
- `GET /discover` - Discover profile suggestions
  - Query: `?limit=20&offset=0&location?&lookingFor?`
  - Response: `{ profiles: [...], pagination: { limit, offset, total, hasMore } }`
  
- `GET /matches` - Get all matches
  - Response: `{ matches: [{ matchId, profile, matchedAt }] }`
  
- `GET /likes` - Get likes (given or received)
  - Query: `?type=given|received`
  - Response: `{ likes: [...] }`

#### Messaging (`/api/v1/conversations`)
- `POST /` (via `/api/v1/messages`) - Send message
  - Body: `{ recipientId, content, messageType?: 'TEXT'|'VOICE'|'IMAGE'|'FILE' }`
  - Response: `{ messageId, conversationId, sentAt }`
  
- `GET /` - List conversations
  - Query: `?limit=20&offset=0`
  - Response: `{ conversations: [{ conversationId, otherUser, lastMessage, lastMessageAt, unreadCount }] }`
  
- `GET /:conversationId` - Get conversation details
  - Response: `{ conversationId, participants, lastMessageAt, unreadCount }`
  
- `GET /:conversationId/messages` - Get messages
  - Query: `?limit=50&offset=0&before?`
  - Response: `{ messages: [{ messageId, senderId, content, messageType, readAt, deliveredAt, createdAt, attachments?, reactions? }] }`
  
- `POST /:conversationId/read` - Mark messages as read
  - Body: `{ messageIds?: string[] }`
  
- `DELETE /:conversationId` - Delete conversation

#### Groups (`/api/v1/groups`)
- `POST /` - Create group
  - Body: `{ name, description?, category, isPublic: boolean }`
  - Response: `{ groupId, name, memberCount, createdAt }`
  
- `GET /` - List groups
  - Query: `?category?&search?&limit=20&offset=0`
  - Response: `{ groups: [{ groupId, name, description, category, memberCount, isPublic, isMember, role }] }`
  
- `GET /:groupId` - Get group details
  
- `PUT /:groupId` - Update group (admin only)
  
- `DELETE /:groupId` - Delete group (admin only)
  
- `POST /:groupId/join` - Join group
  
- `POST /:groupId/leave` - Leave group
  
- `GET /:groupId/members` - Get group members
  - Response: `{ members: [{ userId, profile, role, joinedAt }] }`
  
- `PUT /:groupId/members/:memberId/role` - Update member role (admin only)
  
- `DELETE /:groupId/members/:memberId` - Remove member (admin/moderator)
  
- `GET /:groupId/events` - Get group events

#### Events (`/api/v1/events`)
- `POST /` - Create event
  - Body: `{ groupId?, title, description?, dateTime: ISO string, location, accessibilityNotes? }`
  - Response: `{ eventId, title, attendeeCount, createdAt }`
  
- `GET /` - List events
  - Query: `?groupId?&location?&startDate?&endDate?&limit=20&offset=0`
  - Response: `{ events: [{ eventId, title, description, dateTime, location, accessibilityNotes, attendeeCount, creator, group? }] }`
  
- `GET /:eventId` - Get event details
  
- `PUT /:eventId` - Update event (creator/admin only)
  
- `DELETE /:eventId` - Delete event (creator/admin only)
  
- `POST /:eventId/rsvp` - RSVP to event
  - Body: `{ status: 'going'|'maybe'|'not_going' }`
  - Response: `{ rsvpId, status, createdAt }`
  
- `GET /:eventId/rsvps` - Get event RSVPs
  - Response: `{ rsvps: [{ userId, profile, status, createdAt }] }`

#### KYC Verification (`/api/v1/kyc`)
- `POST /initiate` - Initiate verification
  - Body: `{ method: 'document'|'video_call'|'referral' }`
  - Response: `{ verificationId, method, status: 'pending', uploadUrl? }`
  
- `POST /upload-document` - Upload document (multipart/form-data)
  - Fields: `document` (file), `documentType: string`
  - Response: `{ verificationId, status: 'pending' }`
  
- `POST /schedule-call` - Schedule video call
  - Body: `{ preferredDate, preferredTime, timezone }`
  - Response: `{ verificationId, scheduledAt, meetingLink? }`
  
- `GET /status` - Get verification status
  - Response: `{ verificationId, status: 'pending'|'approved'|'rejected', method, reviewedAt?, rejectionReason? }`
  
- `GET /history` - Get verification history

#### Voice Calls (`/api/v1/calls`)
- `POST /initiate` - Initiate call
  - Body: `{ receiverId }`
  - Response: `{ callId, receiverId, status, createdAt }`
  
- `PUT /:callId/status` - Update call status
  - Body: `{ status: 'INITIATED'|'RINGING'|'ANSWERED'|'REJECTED'|'MISSED'|'ENDED'|'CANCELLED' }`
  
- `POST /:callId/end` - End call
  - Response: `{ callId, duration, endedAt }`
  
- `GET /history` - Get call history
  - Query: `?limit=20&offset=0`
  - Response: `{ calls: [{ callId, participantId, duration, status, startedAt }] }`
  
- `GET /:callId` - Get call details
  
- `GET /webrtc-config` - Get WebRTC configuration
  - Response: `{ stunServers: [...], turnServer?, turnUsername?, turnCredential? }`
  
- `GET /:callId/room` - Get call room name

#### Files (`/api/v1/files`)
- Files are served statically at `/api/v1/files/{type}/{filename}`
- Types: `profiles`, `voice-bios`, `kyc`, `messages`, `events`

---

## WebSocket/Socket.IO Events

### Connection
Connect to WebSocket server with authentication:
```typescript
import { io } from 'socket.io-client';

const socket = io(API_BASE_URL, {
  auth: { token: accessToken },
  transports: ['websocket', 'polling']
});
```

### Message Events
**Client → Server:**
- `message:send` - Send message
  - Data: `{ recipientId, content, messageType? }`
  
- `typing:start` - Start typing indicator
  - Data: `{ conversationId, recipientId }`
  
- `typing:stop` - Stop typing indicator
  - Data: `{ conversationId, recipientId }`
  
- `message:read` - Mark messages as read
  - Data: `{ conversationId, messageIds? }`
  
- `message:edit` - Edit message
  - Data: `{ messageId, content }`
  
- `message:delete` - Delete message
  - Data: `{ messageId }`
  
- `reaction:add` - Add reaction
  - Data: `{ messageId, emoji }`
  
- `reaction:remove` - Remove reaction
  - Data: `{ messageId }`

**Server → Client:**
- `message:sent` - Message sent confirmation
- `message:received` - New message received
- `typing:indicator` - Typing indicator update
- `message:read_receipt` - Read receipt update
- `message:edited` - Message edited
- `message:deleted` - Message deleted
- `reaction:added` - Reaction added
- `reaction:removed` - Reaction removed
- `message:error` - Message error

### Voice Call Events
**Client → Server:**
- `call:initiate` - Initiate call
  - Data: `{ receiverId }`
  
- `call:answer` - Answer call
  - Data: `{ callId }`
  
- `call:reject` - Reject call
  - Data: `{ callId }`
  
- `call:end` - End call
  - Data: `{ callId }`
  
- `call:status` - Update call status
  - Data: `{ callId, status }`
  
- `webrtc:offer` - Send WebRTC offer
  - Data: `{ callId, offer: { type, sdp } }`
  
- `webrtc:answer` - Send WebRTC answer
  - Data: `{ callId, answer: { type, sdp } }`
  
- `webrtc:ice-candidate` - Send ICE candidate
  - Data: `{ callId, candidate }`

**Server → Client:**
- `call:initiated` - Call initiated confirmation
- `call:incoming` - Incoming call
- `call:answered` - Call answered
- `call:rejected` - Call rejected
- `call:ended` - Call ended
- `call:status:updated` - Call status updated
- `webrtc:offer` - WebRTC offer received
- `webrtc:answer` - WebRTC answer received
- `webrtc:ice-candidate` - ICE candidate received
- `call:error` - Call error

---

## Data Models (Prisma Schema)

### User
```typescript
{
  userId: string (UUID)
  phoneNumber: string
  firstName: string
  lastName: string
  email?: string
  countryCode: string
  verified: boolean
  verificationDate?: Date
  lastActive?: Date
  isActive: boolean
  role: 'USER' | 'MODERATOR' | 'ADMIN'
  createdAt: Date
}
```

### Profile
```typescript
{
  profileId: string (UUID)
  userId: string
  bio?: string
  interests: string[] // JSON array
  location?: string
  lookingFor: 'DATING' | 'FRIENDSHIP' | 'HOBBY' | 'ALL'
  voiceBioUrl?: string
  createdAt: Date
  updatedAt: Date
}
```

### Conversation
```typescript
{
  conversationId: string (UUID)
  userAId: string
  userBId: string
  lastMessageAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

### Message
```typescript
{
  messageId: string (UUID)
  conversationId: string
  senderId: string
  content: string
  messageType: 'TEXT' | 'VOICE' | 'IMAGE' | 'FILE' | 'SYSTEM'
  readAt?: Date
  deliveredAt?: Date
  editedAt?: Date
  deletedAt?: Date
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
  attachments?: MessageAttachment[]
  reactions?: MessageReaction[]
}
```

### Group
```typescript
{
  groupId: string (UUID)
  name: string
  description?: string
  creatorId: string
  category: string
  memberCount: number
  isPublic: boolean
  createdAt: Date
}
```

### Event
```typescript
{
  eventId: string (UUID)
  groupId?: string
  creatorId: string
  title: string
  description?: string
  dateTime: Date
  location: string
  accessibilityNotes?: string
  attendeeCount: number
  createdAt: Date
}
```

### Match
```typescript
{
  matchId: string (UUID)
  userAId: string
  userBId: string
  matchedAt: Date
  isActive: boolean
}
```

### VoiceCall
```typescript
{
  callId: string (UUID)
  callerId: string
  receiverId: string
  status: 'INITIATED' | 'RINGING' | 'ANSWERED' | 'REJECTED' | 'MISSED' | 'ENDED' | 'CANCELLED'
  startedAt?: Date
  endedAt?: Date
  duration?: number // seconds
  twilioRoomSid?: string
  createdAt: Date
  updatedAt: Date
}
```

---

## Required Features & Screens

### 1. Authentication Flow (VOICE-FIRST, LINEAR, PREDICTABLE)

**CRITICAL PRINCIPLE:** Login and registration must work **without looking**. If a user launches the app, turns on VoiceOver/TalkBack, and never touches the screen visually, they must still succeed.

**Design Philosophy:**
- No visual-only cues
- No icon-only buttons
- No placeholder-only labels
- No hidden gestures
- No surprise navigation
- Voice-first, linear, predictable, and forgiving

**Screens:**
- Welcome/Onboarding Screen (with optional audio onboarding)
- Login Screen (single, focused screen)
- Registration Flow (multi-step, one task per screen)
  - Step 1: Account Information (phone/email, password, confirm password)
  - Step 2: Profile Basics (name, country, optional bio)
  - Step 3: Accessibility Preferences (language, audio confirmations, vibration, font size)
- Password Reset Flow (request → verify → complete)
- Help/How VOX Works Screen (optional but powerful)

**Overall Auth Flow Structure:**
1. App Launch → Screen reader announces: "Welcome to VOX. A community for blind and visually impaired people."
2. Options (in order, linear):
   - Log in
   - Create a new account
   - Help / How VOX works
3. ➡️ **Use stack navigation only** - Avoid tabs in auth flow

#### Login Screen - Voice-First Design

**Structure (Top → Bottom, Linear):**
1. Screen title (read aloud automatically on load)
2. Phone number or email input
3. Password input
4. "Show password" toggle (accessible checkbox)
5. Log in button
6. Forgot password link
7. Create account link (secondary)

**Implementation Pattern:**
```typescript
// Screen Header - Auto-announced on load
<Text
  accessibilityRole="header"
  accessibilityLabel="Log in to VOX"
>
  Log in
</Text>

// Phone/Email Input - NEVER rely on placeholder alone
<Text accessibilityRole="text">Phone number or email address</Text>
<TextInput
  accessibilityLabel="Phone number or email address"
  accessibilityHint="Enter your phone number or email address"
  keyboardType="email-address"
  autoCapitalize="none"
  autoComplete="email"
/>

// Password Input
<Text accessibilityRole="text">Password</Text>
<TextInput
  accessibilityLabel="Password"
  accessibilityHint="Enter your password"
  secureTextEntry
  autoComplete="password"
/>

// Show Password Toggle
<TouchableOpacity
  accessibilityRole="checkbox"
  accessibilityLabel="Show password"
  accessibilityState={{ checked: showPassword }}
>
  <Text>Show password</Text>
</TouchableOpacity>

// Login Button
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Log in"
  accessibilityHint="Double tap to log in to your account"
>
  <Text>Log in</Text>
</TouchableOpacity>

// Error Announcement (CRITICAL - Must be spoken automatically)
{error && (
  <Text 
    accessibilityRole="alert"
    accessibilityLiveRegion="polite"
  >
    {error}
  </Text>
)}
// Also announce programmatically:
AccessibilityInfo.announceForAccessibility(
  "Login failed. Incorrect phone number or password."
);
```

**Login Requirements:**
- Screen reader reads title immediately on load
- All inputs have explicit labels (not just placeholders)
- Password field has "Show password" toggle
- Errors are spoken automatically via `accessibilityRole="alert"` AND `AccessibilityInfo.announceForAccessibility()`
- Success confirmation: "Login successful. Welcome to VOX."
- Loading state: "Logging in..." (announced)
- Network offline: "You are offline. Some features may not work." (announced)

#### Registration Flow - Multi-Step (DO NOT CROWD)

**Step 1: Account Information**
- Phone number or email
- Password
- Confirm password
- Progress announcement: "Step 1 of 3. Account information."

**Step 2: Profile Basics**
- First name
- Last name
- Country (select list, not free text - use accessible picker)
- Optional bio (with voice dictation support)
- Progress announcement: "Step 2 of 3. Profile information."

**Step 3: Accessibility Preferences (VERY IMPORTANT)**
- Preferred language (select list)
- Enable audio confirmations (toggle, on by default)
- Enable vibration feedback (toggle)
- Font size preference (or follow system)
- Progress announcement: "Step 3 of 3. Accessibility preferences."

**Registration Requirements:**
- One task per screen (never 8 fields on one screen)
- Progress clearly announced at each step
- Back button must exist, be labeled, and announce destination
- Validation errors announced immediately
- Success confirmation: "Account created successfully."
- Each step must be completable without visual reference

#### Password Reset Flow

**Step 1: Request Reset**
- Phone number or email input
- Submit button
- Confirmation: "Password reset link sent to your email/phone."

**Step 2: Verify Token**
- Token/verification code input
- Submit button
- Error handling with clear announcements

**Step 3: Complete Reset**
- New password input
- Confirm password input
- Submit button
- Success: "Password reset successful. You can now log in."

#### Navigation Rules for Auth

**Use ONLY:**
- Buttons (with descriptive labels)
- Lists (accessible lists)
- Toggles (accessible checkboxes/switches)
- Inputs (with labels and hints)

**Avoid:**
- Swipe-only actions
- Long press as primary action
- Drag gestures
- Tabs in auth flow (use stack navigation)

**Back Button Requirements:**
- Must exist on all screens
- Must be labeled: "Back" or "Go back"
- Must announce destination: "Go back to login screen"

#### Voice Feedback & Confirmation Table

| Action               | Feedback                                       |
| -------------------- | ---------------------------------------------- |
| Login success        | "Login successful. Welcome to VOX."            |
| Registration success | "Account created successfully."                |
| Error                | Spoken + alert role + live region              |
| Network offline      | "You are offline. Some features may not work." |
| Validation error     | Field-specific error announced immediately     |
| Loading state        | "Loading..." or "Please wait..."                |
| Step completion      | "Step 1 completed. Moving to step 2."          |

#### Offline-First Considerations (Auth)

- Cache login token securely (AsyncStorage with encryption)
- If offline:
  - Allow access to cached data
  - Announce offline state clearly: "You are offline. Using cached data."
  - Queue registration/login attempts for when online
- Never silently fail - always announce status

#### Visual Design (Still Matters)

Even blind users may have partial vision or rely on high contrast.

**Use:**
- Large text (minimum 16sp, preferably 18sp+)
- High contrast (minimum 4.5:1 for normal text, 3:1 for large text)
- Few colors (avoid color-only information)
- No decorative images in auth screens
- Clear visual focus indicators
- Maximum font size support

#### Audio Onboarding (Highly Recommended)

On first launch, offer:
> "Would you like VOX to guide you with voice prompts?"

This builds **trust immediately** and shows the app is designed for them.

**Implementation:**
- Modal or screen on first launch
- Toggle: "Enable voice guidance"
- Default: ON
- Can be changed in settings later

#### Auth Screen Checklist

✅ Screen reader reads title on load automatically
✅ All inputs have explicit labels (not just placeholders)
✅ All inputs have accessibility hints
✅ Errors are spoken automatically (alert role + programmatic announcement)
✅ Buttons describe what happens next
✅ No information conveyed by color only
✅ Works at maximum font size
✅ Fully usable without looking
✅ Progress clearly announced in multi-step flows
✅ Back button exists and is accessible
✅ Loading states are announced
✅ Success/error confirmations are spoken
✅ Offline state is clearly announced
✅ Voice onboarding option available

#### Suggested Auth Folder Structure

```
src/
├── screens/
│   └── auth/
│       ├── WelcomeScreen.tsx
│       ├── LoginScreen.tsx
│       ├── RegisterStepOneScreen.tsx
│       ├── RegisterStepTwoScreen.tsx
│       ├── RegisterStepThreeScreen.tsx
│       ├── ForgotPasswordScreen.tsx
│       ├── VerifyResetTokenScreen.tsx
│       ├── CompletePasswordResetScreen.tsx
│       └── HelpScreen.tsx
├── components/
│   └── auth/
│       ├── AccessibleAuthInput.tsx
│       ├── AccessibleAuthButton.tsx
│       ├── ProgressIndicator.tsx
│       └── VoiceOnboardingModal.tsx
├── hooks/
│   └── useAuthAccessibility.ts
└── store/
    └── slices/
        └── authSlice.ts
```

#### Country Selection Implementation

- Use accessible picker (not free text input)
- Fetch allowed countries from `/api/v1/auth/allowed-countries`
- Display as searchable list with country names
- Announce: "Select your country. {country name} selected."
- Support keyboard navigation
- Highlight selected country clearly

### 2. KYC Verification Flow
**Screens:**
- KYC Method Selection (Document, Video Call, Referral)
- Document Upload Screen
- Video Call Scheduling Screen
- Verification Status Screen
- Verification History Screen

**Requirements:**
- File picker with accessibility support
- Document type selection
- Upload progress with announcements
- Status updates with clear messaging
- Support for all three verification methods

### 3. Profile Management
**Screens:**
- Profile Creation Screen
- Profile View Screen (own and others)
- Profile Edit Screen
- Voice Bio Recording Screen
- Voice Bio Playback Component

**Requirements:**
- Bio text input (accessible)
- Interests multi-select (accessible tags/chips)
- Location input with suggestions
- Looking for selection (dating/friendship/hobby/all)
- Voice bio recording with play/pause controls
- All fields must be screen reader navigable
- Voice bio must have accessible playback controls

### 4. Discovery/Matches
**Screens:**
- Discovery Feed Screen (swipeable cards or list)
- Profile Detail Screen (from discovery)
- Matches List Screen
- Match Detail Screen
- Likes Screen (given/received)

**Requirements:**
- Profile cards with all information announced
- Like/Pass actions (accessible buttons)
- Match notification with celebration
- Filter options (location, looking for)
- Pagination with "Load More" button
- Match score display (if available)

### 5. Messaging
**Screens:**
- Conversations List Screen
- Chat Screen (individual conversation)
- Message Input Component
- Voice Message Recording Component
- Message Reactions Component

**Requirements:**
- Real-time message updates via WebSocket
- Typing indicators (announced via screen reader)
- Read receipts (announced)
- Message timestamps (accessible format)
- Voice message recording and playback
- Message reactions (emoji picker - accessible)
- Message editing and deletion
- Offline message queue with sync
- Pull-to-refresh for message history
- Infinite scroll for older messages

### 6. Groups
**Screens:**
- Groups List Screen
- Group Discovery Screen
- Group Detail Screen
- Group Members Screen
- Create Group Screen
- Edit Group Screen (admin only)

**Requirements:**
- Group categories filter
- Search functionality (accessible)
- Join/Leave group actions
- Member list with roles
- Group messaging (same as individual messaging)
- Admin/moderator controls (accessible)

### 7. Events
**Screens:**
- Events List Screen
- Event Detail Screen
- Create Event Screen
- Edit Event Screen (creator/admin)
- Event RSVPs Screen
- Event Calendar View (accessible)

**Requirements:**
- Date/time picker (accessible)
- Location input with accessibility notes
- RSVP status (going/maybe/not going)
- Attendee list
- Event reminders (push notifications)
- Calendar integration (accessible)
- Filter by group, location, date range

### 8. Voice Calls
**Screens:**
- Incoming Call Screen
- Active Call Screen
- Call History Screen
- Call Controls (mute, speaker, end)

**Requirements:**
- WebRTC integration for peer-to-peer calls
- STUN/TURN server configuration from API
- Call signaling via WebSocket
- Audio-only interface (no video)
- Call controls must be accessible
- Call duration display
- Missed call notifications
- Call history with accessible list

### 9. Settings
**Screens:**
- Settings Screen
- Account Settings
- Privacy Settings
- Notification Settings
- Accessibility Settings
- About Screen

**Requirements:**
- Change password
- Update profile
- Notification preferences
- Logout functionality
- Account deletion
- All settings must be accessible

---

## Component Architecture

### Folder Structure
```
src/
├── components/
│   ├── accessible/          # Accessibility wrapper components
│   │   ├── AccessibleButton.tsx
│   │   ├── AccessibleInput.tsx
│   │   ├── AccessibleCard.tsx
│   │   ├── AccessiblePicker.tsx
│   │   ├── AccessibleModal.tsx
│   │   └── AccessibleAlert.tsx
│   ├── auth/               # Auth-specific accessible components
│   │   ├── AccessibleAuthInput.tsx
│   │   ├── AccessibleAuthButton.tsx
│   │   ├── ProgressIndicator.tsx
│   │   ├── VoiceOnboardingModal.tsx
│   │   └── CountryPicker.tsx
│   ├── profile/            # Profile-related components
│   │   ├── ProfileCard.tsx
│   │   ├── ProfileForm.tsx
│   │   ├── VoiceBioPlayer.tsx
│   │   └── InterestsSelector.tsx
│   ├── messaging/          # Messaging components
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   ├── VoiceMessageRecorder.tsx
│   │   ├── TypingIndicator.tsx
│   │   └── ReactionsPicker.tsx
│   ├── groups/             # Group components
│   │   ├── GroupCard.tsx
│   │   ├── GroupMemberList.tsx
│   │   └── GroupForm.tsx
│   ├── events/             # Event components
│   │   ├── EventCard.tsx
│   │   ├── EventForm.tsx
│   │   └── RSVPButton.tsx
│   ├── calls/              # Voice call components
│   │   ├── IncomingCallScreen.tsx
│   │   ├── ActiveCallScreen.tsx
│   │   └── CallControls.tsx
│   └── common/             # Shared components
│       ├── LoadingSpinner.tsx
│       ├── ErrorMessage.tsx
│       ├── EmptyState.tsx
│       └── Header.tsx
├── screens/
│   ├── auth/
│   │   ├── WelcomeScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   └── PasswordResetScreen.tsx
│   ├── profile/
│   │   ├── ProfileScreen.tsx
│   │   ├── ProfileEditScreen.tsx
│   │   └── ProfileViewScreen.tsx
│   ├── discover/
│   │   ├── DiscoveryScreen.tsx
│   │   ├── ProfileDetailScreen.tsx
│   │   └── MatchesScreen.tsx
│   ├── messages/
│   │   ├── ConversationsScreen.tsx
│   │   └── ChatScreen.tsx
│   ├── groups/
│   │   ├── GroupsScreen.tsx
│   │   ├── GroupDetailScreen.tsx
│   │   └── CreateGroupScreen.tsx
│   ├── events/
│   │   ├── EventsScreen.tsx
│   │   ├── EventDetailScreen.tsx
│   │   └── CreateEventScreen.tsx
│   ├── calls/
│   │   ├── CallHistoryScreen.tsx
│   │   └── ActiveCallScreen.tsx
│   └── settings/
│       └── SettingsScreen.tsx
├── services/
│   ├── api/                # API service layer
│   │   ├── apiClient.ts
│   │   ├── auth.api.ts
│   │   ├── profile.api.ts
│   │   ├── messaging.api.ts
│   │   ├── groups.api.ts
│   │   ├── events.api.ts
│   │   ├── kyc.api.ts
│   │   └── calls.api.ts
│   ├── websocket/          # WebSocket service
│   │   ├── socketClient.ts
│   │   └── socketEvents.ts
│   ├── storage/            # Local storage
│   │   ├── authStorage.ts
│   │   └── cacheStorage.ts
│   └── accessibility/      # Accessibility helpers
│       ├── accessibilityUtils.ts
│       └── screenReader.ts
├── store/                  # Redux store
│   ├── index.ts
│   ├── slices/
│   │   ├── authSlice.ts
│   │   ├── profileSlice.ts
│   │   ├── messagesSlice.ts
│   │   ├── groupsSlice.ts
│   │   ├── eventsSlice.ts
│   │   └── callsSlice.ts
│   └── middleware/
│       └── offlineMiddleware.ts
├── hooks/                  # Custom React hooks
│   ├── useAuth.ts
│   ├── useWebSocket.ts
│   ├── useAccessibility.ts
│   └── useOfflineSync.ts
├── navigation/
│   ├── AppNavigator.tsx
│   ├── AuthNavigator.tsx
│   └── MainNavigator.tsx
├── utils/
│   ├── validation.ts
│   ├── formatting.ts
│   └── constants.ts
└── types/
    ├── api.types.ts
    ├── models.types.ts
    └── navigation.types.ts
```

---

## Accessibility Requirements (CRITICAL)

### WCAG 2.2 AA Compliance
All features must comply with WCAG 2.2 Level AA standards.

### Voice-First Design Principle
**CRITICAL:** Every screen and feature must work **without looking**. If a user launches the app, turns on VoiceOver/TalkBack, and never touches the screen visually, they must still succeed.

### Screen Reader Support
- ✅ All interactive elements must have `accessibilityLabel`
- ✅ All images must have meaningful `accessibilityLabel` or `accessibilityHint`
- ✅ Form inputs must have explicit labels (NEVER rely on placeholder alone)
- ✅ Groups and regions properly announced via `accessibilityRole`
- ✅ Dynamic content updates announced via `AccessibilityInfo.announceForAccessibility()`
- ✅ Buttons must have descriptive labels (not just "Button")
- ✅ Lists must use proper accessibility roles
- ✅ Headings must use proper hierarchy
- ✅ Screen titles automatically announced on load
- ✅ Errors must be spoken automatically (use `accessibilityRole="alert"` AND programmatic announcement)
- ✅ Success confirmations must be spoken
- ✅ Loading states must be announced
- ✅ Progress indicators must be announced in multi-step flows

### Touch Targets
- ✅ Minimum 48x48 dp for all interactive elements
- ✅ Minimum 8dp spacing between touch targets
- ✅ No small or hard-to-hit buttons

### Color and Contrast
- ✅ Text contrast ratio minimum 4.5:1 for normal text
- ✅ Text contrast ratio minimum 3:1 for large text
- ✅ No information conveyed by color alone
- ✅ Icons must have sufficient contrast

### Audio
- ✅ Voice messages must have accessible playback controls
- ✅ Voice bio must have play/pause/stop controls
- ✅ Call audio must be clear and accessible
- ✅ No audio autoplays without user consent

### Focus Management
- ✅ Clear focus indicators visible
- ✅ Focus order logical and predictable
- ✅ Modal dialogs trap focus properly
- ✅ Focus returns to trigger element after closing

### Testing Requirements
- **MANDATORY:** Test with actual VoiceOver on iOS
- **MANDATORY:** Test with actual TalkBack on Android
- Verify all labels are announced correctly
- Verify all actions are accessible
- Verify navigation flow is logical
- Test with real blind/visually impaired users if possible

### Voice Feedback Patterns (CRITICAL)

**Every major action must provide voice confirmation:**

| Action Type | Feedback Pattern | Implementation |
|------------|------------------|----------------|
| Success | "Action successful. [Details]" | Alert role + programmatic announcement |
| Error | "Error: [Specific message]" | Alert role + programmatic announcement |
| Loading | "[Action] in progress. Please wait." | Live region + programmatic announcement |
| Navigation | "Navigating to [screen name]" | Programmatic announcement before navigation |
| Validation | "[Field name]: [Error message]" | Alert role + focus on field |
| Step Progress | "Step [X] of [Y]. [Step name]." | Programmatic announcement |
| Network Status | "You are offline/online" | Alert role + programmatic announcement |

**Implementation Pattern:**
```typescript
import { AccessibilityInfo } from 'react-native';

// Always use BOTH methods for critical announcements
const announceToScreenReader = (message: string, isAlert: boolean = false) => {
  // Method 1: Programmatic announcement
  AccessibilityInfo.announceForAccessibility(message);
  
  // Method 2: Alert role in UI (for persistent display)
  if (isAlert) {
    // Render with accessibilityRole="alert"
  }
};

// Usage examples:
announceToScreenReader("Login successful. Welcome to VOX.", true);
announceToScreenReader("Step 2 of 3. Profile information.");
announceToScreenReader("Error: Incorrect password. Please try again.", true);
```

### Accessibility Utilities
Create helper functions for:
- Announcing screen reader messages (with alert support)
- Managing focus (auto-focus on errors, next field)
- Formatting dates/times for screen readers ("January 19th, 2025 at 3:30 PM")
- Formatting numbers for screen readers ("One hundred and fifty" for 150)
- Handling accessibility errors gracefully (with voice feedback)
- Screen title announcements on load
- Progress announcements for multi-step flows
- Network status announcements
- Validation error announcements with field focus

---

## State Management

### Redux Slices Required

#### Auth Slice
- User authentication state
- Token management
- Login/logout actions
- Token refresh logic

#### Profile Slice
- Current user profile
- Other user profiles (cache)
- Profile update actions

#### Messages Slice
- Conversations list
- Messages by conversation
- Unread counts
- Typing indicators
- Offline message queue

#### Groups Slice
- Groups list
- Group details
- Group members
- User's group memberships

#### Events Slice
- Events list
- Event details
- RSVPs
- User's event RSVPs

#### Calls Slice
- Active call state
- Call history
- Incoming call state
- WebRTC connection state

### Offline Support
- Queue API requests when offline
- Store messages locally
- Sync when connection restored
- Show offline indicator
- Retry failed requests

---

## Navigation Structure

### Navigation Principles for Accessibility
- **Linear and Predictable:** Use stack navigation for critical flows (auth, KYC, registration)
- **No Hidden Gestures:** All navigation must be via buttons, not swipes
- **Clear Back Navigation:** Back buttons must exist, be labeled, and announce destination
- **No Tabs in Auth Flow:** Use stack navigation only for authentication
- **Announce Navigation:** Announce screen changes programmatically before navigation

### Auth Stack (Linear Flow)
- Welcome Screen (with optional audio onboarding)
  - → Login Screen
  - → Register Step 1 → Step 2 → Step 3
  - → Password Reset Flow
  - → Help Screen
- After Auth: KYC Verification Flow
- After KYC: Main App

### Main Tab Navigator (After Authentication)
1. **Discover Tab** - Discovery feed, matches
2. **Messages Tab** - Conversations list
3. **Groups Tab** - Groups list
4. **Events Tab** - Events list
5. **Profile Tab** - Profile, settings

**Tab Navigation Requirements:**
- Each tab must have clear, descriptive labels
- Tab changes must be announced: "Navigated to [Tab Name]"
- Use `accessibilityLabel` and `accessibilityHint` for tabs
- Support keyboard navigation between tabs

### Stack Navigators
- Each tab has its own stack for detail screens
- Modal screens for creation/editing
- Voice call screens as modals
- All stack navigations must announce destination

### Navigation Announcement Pattern
```typescript
// Before navigation, announce the destination
const navigateWithAnnouncement = (screenName: string, navigation: any) => {
  AccessibilityInfo.announceForAccessibility(
    `Navigating to ${screenName}`
  );
  // Small delay to ensure announcement is heard
  setTimeout(() => {
    navigation.navigate(screenName);
  }, 300);
};
```

---

## Key Implementation Details

### API Client Setup
```typescript
// Configure Axios with:
// - Base URL from environment
// - JWT token interceptor
// - Refresh token logic
// - Error handling
// - Request/response logging
// - Offline queue support
```

### WebSocket Client Setup
```typescript
// Configure Socket.IO with:
// - Authentication via token
// - Auto-reconnect logic
// - Event handlers for all message/call events
// - Connection state management
// - Error handling
```

### Offline Queue
- Store failed requests in AsyncStorage
- Retry on connection restore
- Show sync status to user
- Handle conflicts gracefully

### Voice Recording
- Use expo-av or react-native-voice
- Record audio files
- Upload to backend
- Playback with accessible controls
- Handle permissions

### WebRTC Integration
- Use react-native-webrtc
- Configure STUN/TURN servers from API
- Handle WebRTC signaling via WebSocket
- Manage peer connection lifecycle
- Handle call state changes

### Push Notifications
- Configure expo-notifications
- Request permissions
- Handle notification taps
- Deep linking to relevant screens
- Local notifications for events

### File Upload
- Use expo-image-picker for images
- Use expo-document-picker for documents
- Show upload progress
- Handle errors gracefully
- Support multiple file types

---

## Error Handling

### API Errors
- Display user-friendly error messages
- **CRITICAL:** Announce errors via screen reader using BOTH methods:
  - `accessibilityRole="alert"` in UI
  - `AccessibilityInfo.announceForAccessibility()` programmatically
- Handle network errors gracefully with clear announcements:
  - "Network error. Please check your connection."
  - "You are offline. Some features may not work."
- Show retry options with accessible buttons
- Log errors for debugging
- Never silently fail - always provide voice feedback

### WebSocket Errors
- Handle disconnection gracefully
- Announce disconnection: "Connection lost. Reconnecting..."
- Announce reconnection: "Connection restored."
- Auto-reconnect with exponential backoff
- Show connection status with voice announcements
- Queue messages when disconnected with status announcement

### Validation Errors
- Show field-specific errors immediately
- **CRITICAL:** Announce errors via screen reader:
  - Format: "[Field name]: [Error message]"
  - Use alert role + programmatic announcement
  - Auto-focus on first error field
- Clear errors on input change with confirmation
- Provide helpful hints for correction

### Error Announcement Pattern
```typescript
const handleError = (fieldName: string, errorMessage: string) => {
  // Method 1: UI with alert role
  setError({ field: fieldName, message: errorMessage });
  
  // Method 2: Programmatic announcement
  AccessibilityInfo.announceForAccessibility(
    `${fieldName}: ${errorMessage}`
  );
  
  // Method 3: Focus on error field
  if (fieldRef) {
    fieldRef.current?.focus();
  }
};
```

---

## Performance Requirements

### Response Times
- Screen transitions: < 300ms
- API calls: Show loading states
- Image loading: Progressive loading
- List rendering: Virtualized lists

### Optimization
- Use React.memo for expensive components
- Lazy load screens
- Optimize images
- Cache API responses
- Debounce search inputs

---

## Testing Checklist

### Accessibility Testing
- [ ] All screens tested with VoiceOver
- [ ] All screens tested with TalkBack
- [ ] All interactive elements accessible
- [ ] All labels announced correctly
- [ ] Navigation flow logical
- [ ] Touch targets adequate size
- [ ] Color contrast sufficient

### Functional Testing
- [ ] Authentication flow works
- [ ] KYC verification works
- [ ] Profile creation/editing works
- [ ] Discovery and matching works
- [ ] Messaging works (real-time)
- [ ] Groups work
- [ ] Events work
- [ ] Voice calls work
- [ ] Offline mode works
- [ ] Error handling works

### Integration Testing
- [ ] API integration works
- [ ] WebSocket integration works
- [ ] File upload works
- [ ] Push notifications work
- [ ] Deep linking works

---

## Environment Configuration

Create `.env` file:
```
API_BASE_URL=http://localhost:3000/api/v1
WS_BASE_URL=http://localhost:3000
ENVIRONMENT=development
```

---

## Form Input Patterns (Voice-First)

### Critical Rules for Inputs
1. **NEVER rely on placeholder alone** - Always provide explicit label text
2. **Always provide accessibility hints** - Explain what to enter
3. **Announce validation in real-time** - Don't wait for submit
4. **Auto-focus on errors** - Guide user to problem field
5. **Provide clear success feedback** - Confirm when field is valid

### Input Component Pattern
```typescript
<View>
  {/* Explicit label - NEVER just placeholder */}
  <Text 
    accessibilityRole="text"
    style={styles.label}
  >
    Phone Number
  </Text>
  
  <TextInput
    accessibilityLabel="Phone number"
    accessibilityHint="Enter your phone number with country code"
    placeholder="+356 1234 5678" // Visual aid only, not relied upon
    keyboardType="phone-pad"
    autoComplete="tel"
    onChangeText={(text) => {
      // Real-time validation with voice feedback
      if (isValidPhone(text)) {
        AccessibilityInfo.announceForAccessibility("Phone number format is valid");
      }
    }}
  />
  
  {/* Error message with alert role */}
  {error && (
    <Text 
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {error}
    </Text>
  )}
</View>
```

### Multi-Step Form Pattern
- One task per screen (never crowd)
- Progress clearly announced: "Step 2 of 3"
- Back button always available and labeled
- Validation before proceeding
- Success confirmation at each step

## Development Guidelines

1. **Voice-First Design:** Every feature must work without looking - test with screen readers closed
2. **Accessibility First:** Every component must be accessible from the start
3. **Linear Navigation:** Use stack navigation for critical flows, avoid complex tab structures in auth
4. **Voice Feedback:** Every major action must provide voice confirmation
5. **Type Safety:** Use TypeScript strictly, no `any` types
6. **Error Boundaries:** Implement error boundaries for graceful error handling
7. **Loading States:** Always show loading states with voice announcements
8. **Offline Support:** All features should work offline when possible
9. **Code Organization:** Follow the folder structure strictly
10. **Naming Conventions:** Use descriptive, accessible names
11. **Comments:** Comment complex logic, especially accessibility features
12. **Testing:** Test with screen readers during development (MANDATORY)
13. **Performance:** Optimize for low-end devices
14. **No Visual-Only Cues:** Never rely on color, icons, or visual patterns alone
15. **Explicit Labels:** Always provide text labels, never just placeholders

---

## Deliverables

1. Complete React Native app with all screens
2. Full API integration
3. WebSocket integration for real-time features
4. Offline support with sync
5. Voice call functionality
6. Full accessibility support
7. Error handling throughout
8. Loading states and animations
9. Push notification setup
10. TypeScript types for all API responses
11. Documentation for setup and usage

---

## Critical Notes

1. **Voice-First is Mandatory** - Login and registration must work without looking. If a user launches the app, turns on VoiceOver/TalkBack, and never touches the screen visually, they must still succeed.

2. **Accessibility is not optional** - Every feature must work with screen readers. This is the foundation, not a feature.

3. **Test with real screen readers** - Automated tools are not enough. Test with VoiceOver (iOS) and TalkBack (Android) during development.

4. **Never rely on placeholders** - All inputs must have explicit labels. Placeholders are visual aids only.

5. **Voice feedback is required** - Every major action (success, error, loading, navigation) must provide voice confirmation via both `accessibilityRole="alert"` AND `AccessibilityInfo.announceForAccessibility()`.

6. **Linear and predictable** - Use stack navigation for auth flows. Avoid complex tab structures. One task per screen in multi-step flows.

7. **Offline support is critical** - Users may have poor connectivity. Always announce offline state clearly.

8. **Real-time messaging is essential** - Use WebSocket for all messaging with proper connection status announcements.

9. **Voice calls must be reliable** - WebRTC with proper STUN/TURN configuration. Audio-only interface must be fully accessible.

10. **Error messages must be accessible** - Announce via screen reader using both alert role and programmatic announcement. Auto-focus on error fields.

11. **Loading states must be announced** - Users need feedback. Announce "Loading..." or "Please wait..." for all async operations.

12. **Navigation must be logical** - Screen reader users navigate differently. Announce all navigation changes. Back buttons must exist and be labeled.

13. **No visual-only cues** - Never rely on color, icons, or visual patterns alone. All information must be available via screen reader.

14. **Multi-step flows must announce progress** - "Step 2 of 3" must be announced at each step.

15. **Audio onboarding builds trust** - Offer voice guidance on first launch. This shows the app is designed for blind users.

---

## Getting Started

1. Initialize Expo project with TypeScript
2. Install all required dependencies
3. Set up folder structure
4. Configure API client
5. Set up Redux store
6. Create navigation structure
7. Build accessible components first
8. Implement authentication flow
9. Build remaining features incrementally
10. Test with screen readers throughout

---

**Remember:** This app is for blind and visually impaired users. Accessibility is not a feature - it's the foundation. Every decision should prioritize accessibility and user experience for screen reader users.

---

## Voice-First Quick Reference

### Essential Patterns

**1. Screen Title Announcement (On Load)**
```typescript
useEffect(() => {
  AccessibilityInfo.announceForAccessibility("Log in to VOX");
}, []);
```

**2. Error Announcement (Dual Method)**
```typescript
// Method 1: Alert role in UI
<Text accessibilityRole="alert">{error}</Text>

// Method 2: Programmatic announcement
AccessibilityInfo.announceForAccessibility(`Error: ${error}`);
```

**3. Success Confirmation**
```typescript
AccessibilityInfo.announceForAccessibility("Login successful. Welcome to VOX.");
```

**4. Input with Explicit Label**
```typescript
<Text>Phone Number</Text> {/* NEVER just placeholder */}
<TextInput
  accessibilityLabel="Phone number"
  accessibilityHint="Enter your phone number with country code"
  placeholder="+356 1234 5678" // Visual aid only
/>
```

**5. Progress Announcement**
```typescript
AccessibilityInfo.announceForAccessibility("Step 2 of 3. Profile information.");
```

**6. Loading State**
```typescript
AccessibilityInfo.announceForAccessibility("Logging in. Please wait.");
```

**7. Navigation Announcement**
```typescript
const navigate = () => {
  AccessibilityInfo.announceForAccessibility("Navigating to profile screen");
  navigation.navigate('Profile');
};
```

### Voice-First Checklist for Every Screen

- [ ] Screen title announced on load
- [ ] All inputs have explicit labels (not just placeholders)
- [ ] All inputs have accessibility hints
- [ ] All buttons have descriptive labels
- [ ] Errors announced via alert role + programmatic announcement
- [ ] Success states announced programmatically
- [ ] Loading states announced
- [ ] Navigation changes announced
- [ ] No information conveyed by color alone
- [ ] Works at maximum font size
- [ ] Fully usable without looking
- [ ] Tested with VoiceOver/TalkBack

### Common Mistakes to Avoid

❌ **Using placeholder as label**
```typescript
// BAD
<TextInput placeholder="Enter phone number" />

// GOOD
<Text>Phone Number</Text>
<TextInput 
  accessibilityLabel="Phone number"
  placeholder="+356 1234 5678"
/>
```

❌ **Icon-only buttons**
```typescript
// BAD
<TouchableOpacity>
  <Icon name="check" />
</TouchableOpacity>

// GOOD
<TouchableOpacity accessibilityLabel="Submit form">
  <Icon name="check" />
  <Text>Submit</Text>
</TouchableOpacity>
```

❌ **Silent errors**
```typescript
// BAD
{error && <Text>{error}</Text>}

// GOOD
{error && (
  <>
    <Text accessibilityRole="alert">{error}</Text>
    {AccessibilityInfo.announceForAccessibility(`Error: ${error}`)}
  </>
)}
```

❌ **Crowded forms**
```typescript
// BAD: 8 fields on one screen
// GOOD: Multi-step, one task per screen
```

---

**Remember:** This app is for blind and visually impaired users. Accessibility is not a feature - it's the foundation. Every decision should prioritize accessibility and user experience for screen reader users.

