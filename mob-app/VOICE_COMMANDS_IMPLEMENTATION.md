# Voice Commands Implementation

## Overview
Voice commands have been enabled throughout the VOX app, allowing users to navigate and interact with the app using voice commands. This is a critical accessibility feature for blind and visually impaired users.

## ✅ Implementation Complete

### 1. Voice Command Service ✅
**File:** `services/voice/voiceCommandService.ts`

**Features:**
- Cross-platform voice recognition (React Native and Web)
- Uses `react-native-voice` for mobile platforms
- Uses Web Speech API for web platforms
- Command matching with keyword recognition
- Confidence scoring for command matching
- Extensible command system

**Available Commands:**
- **Navigation:** discover, messages, events, groups, profile, back
- **Actions:** like, pass, send message, search, filter, refresh
- **Help:** help, commands

### 2. Voice Command Button Component ✅
**File:** `components/accessible/VoiceCommandButton.tsx`

**Features:**
- Toggle button to enable/disable voice commands
- Visual indicator when listening
- Haptic feedback on toggle
- Fully accessible with proper labels

### 3. Voice Command Overlay ✅
**File:** `components/accessible/VoiceCommandOverlay.tsx`

**Features:**
- Floating button overlay on all screens
- Help modal showing available commands
- Accessible help interface
- Positioned for easy access

### 4. Voice Commands Hook ✅
**File:** `hooks/useVoiceCommands.ts`

**Features:**
- React hook for easy integration
- Handles navigation commands
- Supports custom command registration
- Automatic cleanup on unmount

### 5. Integration ✅

**Screens Integrated:**
- **MainNavigator:** Voice command overlay added
- **DiscoverScreen:** Like, pass, filter, search, refresh commands
- **ChatScreen:** Send message command

**Navigation Commands:**
- All navigation commands work globally via the hook

---

## 📋 Usage

### For Users

1. **Enable Voice Commands:**
   - Tap the microphone button (floating button on bottom right)
   - Grant microphone permission when prompted
   - Voice commands are now active

2. **Available Commands:**
   - Say "discover" to navigate to discover screen
   - Say "messages" to navigate to messages
   - Say "like" to like current profile
   - Say "pass" to pass on current profile
   - Say "filter" to open/close filters
   - Say "help" to hear all available commands

3. **Disable Voice Commands:**
   - Tap the microphone button again
   - Voice commands will stop listening

### For Developers

#### Adding Voice Commands to a Screen

```typescript
import { useVoiceCommands } from '../../hooks/useVoiceCommands';

export const MyScreen: React.FC = () => {
  const { registerCommand } = useVoiceCommands('MyScreen');

  useEffect(() => {
    const unsubscribe = registerCommand('my_action', () => {
      // Handle the action
      doSomething();
    });

    return () => unsubscribe();
  }, [registerCommand]);
};
```

#### Adding Custom Commands

```typescript
import { voiceCommandService } from '../../services/voice/voiceCommandService';

voiceCommandService.addCommand({
  id: 'custom_action',
  keywords: ['custom', 'action', 'do something'],
  action: 'custom_action',
  description: 'Perform custom action',
});
```

#### Manual Command Processing

```typescript
await voiceCommandService.processManualCommand('like');
```

---

## 🎯 Command Reference

### Navigation Commands
| Command | Keywords | Description |
|---------|----------|-------------|
| `open_discover` | discover, find, browse, explore | Navigate to discover screen |
| `open_messages` | messages, chats, conversations | Navigate to messages screen |
| `open_events` | events, calendar, activities | Navigate to events screen |
| `open_groups` | groups, communities, clubs | Navigate to groups screen |
| `open_profile` | profile, my profile, account | Navigate to profile screen |
| `go_back` | back, go back, return | Go back to previous screen |

### Action Commands
| Command | Keywords | Description |
|---------|----------|-------------|
| `like_profile` | like, yes, interested, match | Like current profile |
| `pass_profile` | pass, skip, next, no | Pass on current profile |
| `send_message` | send message, message, reply | Send a message |
| `search` | search, find, look for | Open search |
| `filter` | filter, filters | Open/close filters |
| `refresh` | refresh, reload, update | Refresh current screen |

### Help Commands
| Command | Keywords | Description |
|---------|----------|-------------|
| `help` | help, what can I say, commands | Show available commands |

---

## 🔧 Technical Details

### Platform Support
- **React Native (iOS/Android):** Uses `react-native-voice`
- **Web:** Uses Web Speech API (webkitSpeechRecognition)

### Permissions
- **Microphone Permission:** Required for voice recognition
- Requested automatically when starting voice commands
- User-friendly error messages if permission denied

### Command Matching
- Keyword-based matching
- Confidence scoring (minimum 0.3 threshold)
- Best match selection
- Handles variations and synonyms

### Accessibility
- All commands announced via screen reader
- Haptic feedback for command recognition
- Visual indicators when listening
- Help modal with full command list

---

## 📦 Files Created

1. `services/voice/voiceCommandService.ts` - Core voice command service
2. `components/accessible/VoiceCommandButton.tsx` - Toggle button component
3. `components/accessible/VoiceCommandOverlay.tsx` - Floating overlay component
4. `hooks/useVoiceCommands.ts` - React hook for integration
5. `types/react-native-voice.d.ts` - TypeScript declarations

---

## 📝 Files Modified

1. `navigation/MainNavigator.tsx` - Added VoiceCommandOverlay
2. `screens/discover/DiscoverScreen.tsx` - Integrated voice commands
3. `screens/messages/ChatScreen.tsx` - Integrated voice commands

---

## 🎉 Summary

Voice commands are now fully enabled throughout the VOX app:

✅ Voice recognition service (cross-platform)
✅ Voice command button and overlay
✅ Navigation commands (global)
✅ Screen-specific commands (Discover, Chat)
✅ Help system
✅ Full accessibility support
✅ Haptic feedback
✅ Error handling

**Next Steps (Optional):**
- Add more screen-specific commands
- Implement voice command training
- Add command history
- Support multiple languages
- Add voice command shortcuts

---

## 🚀 Getting Started

1. **Enable Voice Commands:**
   - Launch the app
   - Tap the microphone button (bottom right)
   - Grant microphone permission
   - Start using voice commands!

2. **Try These Commands:**
   - "Discover" - Navigate to discover screen
   - "Like" - Like current profile
   - "Messages" - Navigate to messages
   - "Help" - See all available commands

Voice commands make the VOX app truly hands-free and accessible! 🎤

