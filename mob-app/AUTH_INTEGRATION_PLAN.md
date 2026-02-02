# Auth integration plan (mob-app ↔ backend)

## Auth model: OTP-only

- **Login:** Phone number → Send OTP (LOGIN) → Verify OTP → authenticated. No password.
- **Register:** Phone number → Send OTP (REGISTRATION) → Verify OTP → user created and authenticated.
- **Password reset** is not used in the app; backend still supports it for legacy/email flows. ForgotPassword / VerifyResetToken / CompletePasswordReset screens are removed from the auth navigator.

## Done

### 1. Request/response logging (apiClient)
- In development, every request logs `[API Request]` / `[API Response]` / `[API Error]` with sensitive fields redacted.

### 2. API client
- Refresh handles backend `{ token, expiresIn }` only; 401 retry skips `/auth/refresh` and `/auth/login`.

### 3. Auth API service (`services/api/authService.ts`)
- OTP-only surface: sendOTP, verifyOTP, register, login, refresh, logout, getAllowedCountries.
- Password reset and change-password methods removed from the app’s authService.

### 4. Auth state (authSlice)
- **User mapping:** Backend snake_case / minimal user mapped via `mapBackendAuthUserToUser` and `mapBackendProfileToUser`.
- **After verifyOTP:** Tokens stored, WebSocket connected, then `GET /profile/me`; full profile user merged into auth state when available.
- **initializeAuth:** Token → refresh → WebSocket → `GET /profile/me` (or 404 = authenticated, no profile yet).
- **Errors:** Thunks reject with `{ code, message }`; state has `error` and `errorCode`.
- **Allowed countries:** `getAllowedCountries` thunk; state has `allowedCountries` and `allowedCountriesLoaded`.

### 5. Route protection (App.tsx)
- `initialRouteName = isAuthenticated ? 'Main' : 'Auth'`; logout navigates to Auth.

### 6. Profile after OTP
- In `verifyOTP` thunk, after success we call `GET /profile/me` and merge `mapBackendProfileToUser(profile)` into the returned user so the app has full display name etc.

### 7. Allowed countries on Register
- Register screen dispatches `getAllowedCountries()` on mount.
- When `allowedCountriesLoaded && allowedCountries.length > 0`, shows “Available in: Malta, United Kingdom, …” (from backend `GET /auth/allowed-countries`).

### 8. Errors in UI
- Auth error payload is `{ code, message }`; Login, Register, and OTP screens show `error` and use `errorCode` in `accessibilityLabel` where set.

### 9. Password reset removed from flow
- AuthNavigator no longer includes ForgotPassword, VerifyResetToken, CompletePasswordReset.
- Auth stack: Welcome, Login, Register, OTPVerification, Help only.

## Backend alignment (OTP-only)

| Mob-app                          | Backend |
|----------------------------------|---------|
| `POST /auth/send-otp`            | `phoneNumber`, `purpose` (REGISTRATION | LOGIN) |
| `POST /auth/verify-otp`          | `phoneNumber`, `otpCode`, `purpose` → tokens + user |
| `GET /auth/allowed-countries`    | Returns `{ countries: [{ code, name }] }` |
| `POST /auth/refresh`             | Bearer refresh token → `{ token, expiresIn }` |
| `POST /auth/logout`              | Bearer access token |
| `GET /profile/me`                | Bearer access token → profile + user (snake_case). 404 if no profile. |

## Env (mob-app)

- `API_BASE_URL`: e.g. `http://localhost:3000/api/v1` (or machine IP for device).
- `WS_BASE_URL`: e.g. `http://localhost:3000`.

## Next steps (optional)

1. **Tests:** Integration tests for auth flow (send OTP → verify OTP → profile/me, logout).
2. **Country picker:** Use `allowedCountries` for a dropdown/list before sending OTP if you want to restrict by country in the UI.
