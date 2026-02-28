# Liamapp ↔ Backend Feature Audit

Audit date: 2025-02-28

## Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Auth (login/register) | ✅ OK | Phone/email login, validation aligned |
| Direct messaging | ✅ OK | Conversations, messages, attachments aligned |
| Group creation | ✅ OK | Schema matches |
| Group chat | ✅ OK | Messages, attachments aligned |
| Events | ✅ OK | Create, list, detail, RSVP aligned |
| Discover | ✅ OK | Profiles, likes, matches aligned |
| Profile | ✅ OK | Get, update, voice bio, like/unlike aligned |
| Voice calls | ✅ OK | Initiate call fixed (receiverId); pagination uses limit/offset |
| Notifications | ✅ OK | List endpoint aligned |
| KYC | ✅ OK | Status, history aligned |

---

## 1. Messaging (Direct Chats)

### Endpoints
- `GET /conversations` → List conversations ✅
- `GET /conversations/:id/messages` → Get messages ✅
- `POST /conversations/:id/read` → Mark as read ✅
- `POST /messages` → Send message (recipientId, content, messageType, attachmentIds) ✅
- `POST /messages/attachments` → Upload attachment (field: messageAttachment) ✅
- `PUT /messages/:id` → Edit message ✅
- `DELETE /messages/:id` → Delete message ✅

### Validation
- sendMessageSchema: recipientId, content, messageType, attachmentIds (camelCase) ✅

---

## 2. Groups

### Endpoints
- `GET /groups` → List (page, limit, search, memberOnly) ✅
- `POST /groups` → Create (name, description, category, isPublic) ✅
- `GET /groups/:id` → Get group ✅
- `GET /groups/:id/messages` → Get group messages ✅
- `POST /groups/:id/messages` → Send (content, message_type, attachmentIds) ✅
- `POST /groups/:id/attachments` → Upload group attachment ✅
- `POST /groups/:id/members` → Add member (userId) ✅
- `GET /groups/:id/members/search` → Search users (q) ✅

### Validation
- createGroupSchema: name, description (optional), category, isPublic ✅
- sendGroupMessageSchema: content, message_type, attachmentIds ✅

---

## 3. Events

### Endpoints
- `GET /events` → List (limit, offset, upcomingOnly) ✅
- `POST /events` → Create (title, dateTime, location, description, groupId, accessibilityNotes) ✅
- `GET /events/:id` → Get event ✅
- `POST /events/:id/rsvp` → RSVP (status: GOING | MAYBE | NOT_GOING) ✅

### Validation
- createEventSchema: title, dateTime (ISO 8601), location (min 1), description optional ✅
- App sends location 'TBD' when empty ✅

---

## 4. Discover

### Endpoints
- `GET /profiles/discover` → Discover profiles (limit, offset) ✅
- `GET /profiles/matches` → Matches ✅
- `GET /profiles/likes` → Likes (type: given/received) ✅
- `POST /profile/:userId/like` → Like profile ✅
- `DELETE /profile/:userId/like` → Unlike ✅

---

## 5. Profile

### Endpoints
- `GET /profile/me` → My profile ✅
- `GET /profile/:userId` → Get profile ✅
- `PUT /profile/:userId` → Update profile ✅
- `POST /profile/voice-bio` → Upload voice bio ✅
- `DELETE /profile/voice-bio` → Delete voice bio ✅

---

## 6. Voice Calls

### Initiate call — FIXED
- App was sending `receiver_id` (snake_case); backend expects `receiverId` (camelCase).
- Fixed: `CallsService.initiate` now sends `receiverId`.

### Call history pagination
- Backend uses `limit` and `offset`; app sends `page` and `limit`.
- First page works (page 1 → offset 0). If app adds "load more", send `offset` instead of `page`.

---

## 7. Notifications

- `GET /notifications` (limit) ✅

---

## 8. KYC

- Status, history, initiate, upload, etc. — routes aligned ✅
