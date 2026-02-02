# Integration Gaps: mob-app ↔ backend

This document lists integration status between the mobile app and the backend API. Items marked **Implemented** below have been wired in the mob-app.

---

## 1. Mob-app screens / flows not wired to backend

| Screen / flow                      | Current state                               | Backend support                  | Action                                                                                                                                  |
| ---------------------------------- | ------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **CreateGroupScreen**              | ✅ Wired to API                             | ✅ `POST /api/v1/groups`         | **Implemented:** createGroup thunk (groupsSlice) calls groupsService.createGroup; navigate back on success; category + isPublic.        |
| **GroupChatScreen**                | Real group chat (messages + send)          | ✅ `GET/POST /api/v1/groups/:id/messages` | **Implemented:** Backend GroupMessage + GET/POST group messages; mob-app GroupChatScreen fetches/sends; WhatsApp-style UI.             |
| **ProfileDetailScreen** (Discover) | Real API + like/unlike + **Voice call**      | ✅ Profile, like, **calls**       | Implemented: profileService, like/unlike, Call button → CallScreen (voiceCallService).                                                    |
| **NotificationsScreen**            | Uses GET /notifications or client fallback     | ✅ `GET /api/v1/notifications` | **Implemented:** Backend GET /notifications aggregates matches, likes, conversations, events; mob-app tries API first, falls back to client-side aggregation; navigation wired. |

---

## 2. Create Event payload / response mismatch (fixed)

| Area             | Issue                                                                                                                               | Status / Fix                                                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Create event** | Backend expects `dateTime` (ISO string) and **required** `location`. Mob-app sends `startTime`, `endTime`, and optional `location`. | **Done:** eventsService.createEvent sends `dateTime: data.startTime` (ISO), `location: data.location \|\| 'TBD'`. CreateEventScreen passes startTime as ISO and location (required).   |
| **Event detail** | Backend returns `date_time` (snake_case). EventDetailScreen uses `event.startTime`.                                                 | **Done:** eventsService.mapBackendEvent maps `date_time` → `startTime`; getEvent returns Event with startTime. EventDetailScreen uses event.startTime.                                   |

---

## 3. Backend APIs with no mob-app usage

| Backend area    | Routes / capability                                                                       | Mob-app                                                                          | Suggestion                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **KYC**         | `/api/v1/kyc` – initiate, upload-document, schedule-call, status, history                 | ✅ kycService + **KYCVerificationScreen** (Settings → Verify identity)           | Implemented: KYCVerificationScreen shows status, history, Start verification (initiate); entry from Settings.                            |
| **Voice calls** | `/api/v1/calls` – initiate, status, end, history, webrtc-config, room                    | ✅ voiceCallService + **CallScreen** + Call buttons (ProfileDetail, Chat)          | Implemented: CallScreen on root stack; Call buttons on ProfileDetailScreen (matched) and ChatScreen; initiate/end via voiceCallService.  |
| **Admin**       | `/api/v1/admin` – admin-only operations                                                   | No admin panel in app                                                            | Optional: add an admin-only section or separate admin app; not required for standard user app.             |
| **Countries**   | `/api/v1/countries` (if present)                                                          | Allowed countries used via `GET /auth/allowed-countries` in authSlice            | No change if allowed-countries is enough; use countries route only if you need full list elsewhere.        |

---

## 4. Already integrated (reference)

- **Auth**: login, OTP, register, refresh, logout, allowed-countries, password-reset (request; verify/complete used in flows).
- **Profile**: get my profile, get/update/delete profile, voice bio upload/delete, like/unlike (profileService).
- **Discovery**: discover profiles, matches, likes (discoveryService).
- **Messages**: list conversations, get messages, send message, mark read (messagingService + messagesSlice). **WhatsApp-style UI**: green header, dark chat, green/teal bubbles, send button.
- **Groups**: list groups, getUserGroups, join group, **create group**, **group messages** (GET/POST `/groups/:id/messages`) (groupsService). GroupsScreen shows last message preview; GroupChatScreen full chat (WhatsApp-style dark UI, sender names).
- **Events**: list events, getUserEvents, get event, RSVP, **create event** (eventsService); payload fixed (dateTime, location); getEvent maps date_time → startTime.
- **Files**: Voice bio upload goes through profile API; static file serving at `/api/v1/files` used as needed.

---

## 5. Status (implemented in mob-app)

1. **CreateGroupScreen** → calls `groupsService.createGroup` via createGroup thunk; category + isPublic.
2. **Create Event** → eventsService sends `dateTime`, required `location`; getEvent maps `date_time` → `startTime`.
3. **ProfileDetailScreen** → loads `profileService.getProfile(userId)`, like/unlike via API; isLiked/isMatched from getLikes/getMatches; **Voice call** button (matched users) → CallScreen.
4. **GroupChatScreen** → real group chat: GET/POST `/api/v1/groups/:groupId/messages`; WhatsApp-style dark chat UI; sender name on messages; last message preview on Groups list when available.
5. **voiceCallService.ts** + **CallScreen** (root stack) + Call buttons on ProfileDetailScreen (matched) and ChatScreen; initiate/end via API.
6. **kycService.ts** + **KYCVerificationScreen** (status, history, Start verification); entry from Settings → “Verify identity”.
7. **NotificationsScreen** → GET /notifications (backend aggregates); mob-app uses API when available, falls back to client-side aggregation; navigation to Chat, ProfileDetail, EventDetail, GroupChat.

---

_Generated from codebase review of `mob-app/` and `backend/`._
