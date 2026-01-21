# VOX Mobile App

A React Native mobile application built with Expo for the VOX community platform, exclusively designed for blind and visually impaired people.

## Features

- **Voice-First Design**: Every screen works with VoiceOver (iOS) and TalkBack (Android)
- **Full Accessibility**: WCAG 2.2 AA compliant from day one
- **Authentication Flow**: Complete login, registration, and password reset flows
- **Real-time Messaging**: WebSocket integration for instant messaging
- **Offline Support**: Works offline with sync when connection is restored
- **Voice Calls**: WebRTC integration for peer-to-peer voice calls

## Technology Stack

- **Framework**: React Native with Expo (managed workflow)
- **Language**: TypeScript
- **State Management**: Redux Toolkit with Redux Persist
- **Navigation**: React Navigation v6
- **HTTP Client**: Axios with interceptors
- **WebSocket**: Socket.IO Client
- **Offline Storage**: AsyncStorage + Redux Persist

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development) or Android Emulator (for Android development)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_WS_BASE_URL=http://localhost:3000
EXPO_PUBLIC_ENVIRONMENT=development
```

3. Start the development server:
```bash
npm start
```

4. Run on your preferred platform:
```bash
# iOS
npm run ios

# Android
npm run android

# Web (for testing)
npm run web
```

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── accessible/     # Accessibility wrapper components
│   ├── auth/           # Auth-specific components
│   └── common/         # Shared components
├── screens/            # Screen components
│   ├── auth/           # Authentication screens
│   ├── profile/        # Profile screens
│   ├── discover/       # Discovery screens
│   ├── messages/       # Messaging screens
│   ├── groups/         # Groups screens
│   ├── events/         # Events screens
│   └── settings/       # Settings screens
├── services/           # Service layer
│   ├── api/            # API service files
│   ├── websocket/      # WebSocket client
│   ├── storage/        # Local storage utilities
│   └── accessibility/  # Accessibility helpers
├── store/              # Redux store
│   ├── slices/         # Redux slices
│   └── middleware/     # Redux middleware
├── navigation/         # Navigation setup
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── types/               # TypeScript type definitions
```

## Accessibility

This app is built with accessibility as the foundation, not an afterthought. Every feature must work without looking - if a user launches the app, turns on VoiceOver/TalkBack, and never touches the screen visually, they must still succeed.

### Key Accessibility Features

- All interactive elements have explicit labels
- All inputs have labels (never just placeholders)
- Errors are announced automatically via screen reader
- Success confirmations are spoken
- Loading states are announced
- Navigation changes are announced
- Screen titles are announced on load

### Testing with Screen Readers

**iOS (VoiceOver):**
1. Enable VoiceOver in Settings > Accessibility > VoiceOver
2. Or use Cmd+F5 in the iOS Simulator

**Android (TalkBack):**
1. Enable TalkBack in Settings > Accessibility > TalkBack
2. Or use the accessibility shortcut

## Development Guidelines

1. **Voice-First Design**: Every feature must work without looking
2. **Accessibility First**: Every component must be accessible from the start
3. **Linear Navigation**: Use stack navigation for critical flows
4. **Voice Feedback**: Every major action must provide voice confirmation
5. **Type Safety**: Use TypeScript strictly, no `any` types
6. **Error Handling**: Always provide voice feedback for errors
7. **Offline Support**: All features should work offline when possible

## API Integration

The app connects to the VOX backend API. Make sure the backend is running before starting the app.

Default API URL: `http://localhost:3000/api/v1`

## Environment Variables

Create a `.env` file with the following variables:

- `EXPO_PUBLIC_API_BASE_URL`: Backend API base URL
- `EXPO_PUBLIC_WS_BASE_URL`: WebSocket server URL
- `EXPO_PUBLIC_ENVIRONMENT`: Environment (development/production)

## Building for Production

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

## License

Private - VOX Platform

