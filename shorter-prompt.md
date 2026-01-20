# VOX React Native Frontend - Short Prompt

## Mission
Build a React Native app (iOS/Android) for blind and visually impaired users. **Every feature must work without looking.** If a user turns on VoiceOver/TalkBack and never looks at the screen, they must succeed.

## Core Principle: Voice-First Design
- Login/registration must work **without looking**
- No visual-only cues, no icon-only buttons, no placeholder-only labels
- All actions must provide voice confirmation
- Linear, predictable navigation

## Tech Stack
- React Native with Expo (TypeScript)
- Redux Toolkit or Zustand
- React Navigation v6
- Axios + Socket.IO Client
- react-native-webrtc (voice calls)
- expo-av (voice recording)
- AsyncStorage (offline support)

## Backend API
- Base: `http://localhost:3000/api/v1`
- Auth: JWT tokens in `Authorization: Bearer <token>` header
- Response format: `{ success: boolean, data?: any, error?: { code, message }, meta?: { timestamp, requestId } }`

### Key Endpoints
- **Auth:** `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/allowed-countries`
- **Profile:** `/profile/me`, `/profile/:userId`, `/profile/voice-bio`
- **Discovery:** `/profiles/discover`, `/profiles/matches`, `/profiles/likes`
- **Messaging:** `/conversations`, `/conversations/:id/messages`, `/messages` (POST)
- **Groups:** `/groups`, `/groups/:id/join`, `/groups/:id/members`
- **Events:** `/events`, `/events/:id/rsvp`
- **KYC:** `/kyc/initiate`, `/kyc/upload-document`, `/kyc/status`
- **Calls:** `/calls/initiate`, `/calls/history`, `/calls/webrtc-config`

## WebSocket Events (Socket.IO)
**Connect:** `io(API_URL, { auth: { token } })`

**Message Events:**
- Send: `message:send` → Receive: `message:received`, `message:sent`
- Typing: `typing:start`, `typing:stop` → Receive: `typing:indicator`
- Read: `message:read` → Receive: `message:read_receipt`
- Reactions: `reaction:add`, `reaction:remove`

**Call Events:**
- Initiate: `call:initiate` → Receive: `call:incoming`
- Answer/Reject: `call:answer`, `call:reject`
- WebRTC: `webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate`

## Authentication Flow (Voice-First)

### Login Screen
```typescript
// 1. Auto-announce title on load
useEffect(() => {
  AccessibilityInfo.announceForAccessibility("Log in to VOX");
}, []);

// 2. Explicit label (NEVER just placeholder)
<Text>Phone number or email</Text>
<TextInput
  accessibilityLabel="Phone number or email address"
  accessibilityHint="Enter your phone number or email"
/>

// 3. Error with dual announcement
{error && (
  <>
    <Text accessibilityRole="alert">{error}</Text>
    {AccessibilityInfo.announceForAccessibility(`Error: ${error}`)}
  </>
)}

// 4. Success confirmation
AccessibilityInfo.announceForAccessibility("Login successful. Welcome to VOX.");
```

### Registration (3 Steps)
**Step 1:** Account info (phone/email, password, confirm)
- Announce: "Step 1 of 3. Account information."

**Step 2:** Profile basics (name, country, optional bio)
- Announce: "Step 2 of 3. Profile information."

**Step 3:** Accessibility preferences (language, audio confirmations, vibration)
- Announce: "Step 3 of 3. Accessibility preferences."

**Rules:**
- One task per screen (never crowd)
- Progress announced at each step
- Back button always available and labeled
- Success confirmation: "Account created successfully."

## Required Screens

### Auth
- Welcome (with optional audio onboarding)
- Login
- Register (3 steps)
- Password Reset (3 steps)
- Help/How VOX Works

### Main App (Tab Navigator)
1. **Discover** - Profile discovery, matches, likes
2. **Messages** - Conversations, chat (real-time via WebSocket)
3. **Groups** - Groups list, group details, create/join
4. **Events** - Events list, event details, RSVP
5. **Profile** - Profile view/edit, settings, KYC status

### Modals
- Voice call (incoming/active)
- Voice bio recording/playback
- KYC document upload
- Event creation/edit

## Accessibility Requirements (MANDATORY)

### Voice Feedback Pattern
```typescript
// ALWAYS use both methods for critical announcements
const announce = (message: string, isAlert = false) => {
  AccessibilityInfo.announceForAccessibility(message);
  if (isAlert) {
    // Also render with accessibilityRole="alert"
  }
};
```

### Required Announcements
- **Screen load:** Title announced automatically
- **Success:** "Action successful. [Details]"
- **Error:** "Error: [Message]" (alert role + programmatic)
- **Loading:** "[Action] in progress. Please wait."
- **Navigation:** "Navigating to [screen name]"
- **Validation:** "[Field]: [Error]" + auto-focus on field
- **Progress:** "Step X of Y. [Step name]."

### Input Pattern (CRITICAL)
```typescript
// ❌ NEVER this:
<TextInput placeholder="Enter phone" />

// ✅ ALWAYS this:
<Text>Phone Number</Text>
<TextInput
  accessibilityLabel="Phone number"
  accessibilityHint="Enter your phone number"
  placeholder="+356 1234 5678" // Visual aid only
/>
```

### Touch Targets
- Minimum 48x48 dp
- Minimum 8dp spacing
- All buttons have descriptive labels

### Color & Contrast
- Text contrast: 4.5:1 (normal), 3:1 (large)
- No information by color alone
- High contrast mode support

## Component Structure
```
src/
├── components/
│   ├── accessible/     # AccessibleButton, AccessibleInput, AccessibleCard
│   ├── auth/          # AccessibleAuthInput, ProgressIndicator
│   ├── profile/       # ProfileCard, VoiceBioPlayer
│   ├── messaging/     # MessageBubble, MessageInput, TypingIndicator
│   └── calls/         # IncomingCallScreen, ActiveCallScreen
├── screens/
│   ├── auth/          # Login, Register (3 steps), PasswordReset
│   ├── discover/      # DiscoveryScreen, MatchesScreen
│   ├── messages/      # ConversationsScreen, ChatScreen
│   ├── groups/        # GroupsScreen, GroupDetailScreen
│   ├── events/        # EventsScreen, EventDetailScreen
│   └── profile/        # ProfileScreen, SettingsScreen
├── services/
│   ├── api/           # apiClient, auth.api, messaging.api, etc.
│   ├── websocket/     # socketClient, socketEvents
│   └── accessibility/ # accessibilityUtils, screenReader
├── store/slices/      # authSlice, profileSlice, messagesSlice, etc.
└── hooks/             # useAuth, useWebSocket, useAccessibility
```

## State Management (Redux)
- **authSlice:** User, tokens, login/logout
- **profileSlice:** Current profile, cached profiles
- **messagesSlice:** Conversations, messages, unread counts, typing indicators
- **groupsSlice:** Groups list, members, memberships
- **eventsSlice:** Events list, RSVPs
- **callsSlice:** Active call, call history, WebRTC state

## Offline Support
- Queue API requests when offline
- Store messages locally (AsyncStorage)
- Sync when connection restored
- Announce: "You are offline. Some features may not work."

## Voice Calls (WebRTC)
- Get STUN/TURN config from `/calls/webrtc-config`
- Signaling via WebSocket (`webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate`)
- Audio-only interface (no video)
- Call controls must be accessible
- Announce: "Incoming call from [name]"

## Critical Implementation Rules

1. **Voice-First:** Every screen must work without looking
2. **Explicit Labels:** Never rely on placeholders alone
3. **Dual Error Announcement:** Alert role + programmatic announcement
4. **Linear Navigation:** Stack navigation for auth, no tabs in auth flow
5. **Progress Announcements:** "Step X of Y" at each step
6. **Success Confirmations:** Always announce successful actions
7. **Loading States:** Always announce "Loading..." or "Please wait..."
8. **Navigation Announcements:** Announce before navigating
9. **Test with Screen Readers:** VoiceOver (iOS) and TalkBack (Android) - MANDATORY
10. **No Visual-Only Cues:** Never rely on color, icons, or visual patterns alone

## Quick Reference

### Screen Title on Load
```typescript
useEffect(() => {
  AccessibilityInfo.announceForAccessibility("Screen Name");
}, []);
```

### Error Announcement
```typescript
<Text accessibilityRole="alert">{error}</Text>
AccessibilityInfo.announceForAccessibility(`Error: ${error}`);
```

### Success Confirmation
```typescript
AccessibilityInfo.announceForAccessibility("Action successful. [Details]");
```

### Navigation
```typescript
AccessibilityInfo.announceForAccessibility("Navigating to [screen]");
navigation.navigate('Screen');
```

## Testing Checklist
- [ ] All screens tested with VoiceOver (iOS)
- [ ] All screens tested with TalkBack (Android)
- [ ] Login works without looking
- [ ] Registration works without looking
- [ ] All errors are announced
- [ ] All successes are announced
- [ ] Navigation is announced
- [ ] Loading states are announced
- [ ] No visual-only information
- [ ] Touch targets are adequate size

## Environment
```
API_BASE_URL=http://localhost:3000/api/v1
WS_BASE_URL=http://localhost:3000
ENVIRONMENT=development
```

---

**Remember:** This app is for blind and visually impaired users. Accessibility is not a feature - it's the foundation. Every decision must prioritize voice-first, screen reader-friendly design.

