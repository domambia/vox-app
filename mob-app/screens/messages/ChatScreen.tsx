import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { OfflineBanner } from '../../components/accessible/OfflineBanner';
import { websocketService, MessageEvent, TypingEvent } from '../../services/websocket/websocketService';
import { voiceRecordingService } from '../../services/audio/voiceRecordingService';
import { useVoiceCommands } from '../../hooks/useVoiceCommands';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { getMessages, sendMessage, markAsRead } from '../../store/slices/messagesSlice';

type MainTabParamList = {
    Messages: undefined;
    Chat: { conversationId?: string; participantName: string; participantId?: string };
};

type ChatScreenNavigationProp = NativeStackNavigationProp<MainTabParamList, 'Chat'>;
type ChatScreenRouteProp = RouteProp<MainTabParamList, 'Chat'>;

interface MessageRow {
    id: string;
    content: string;
    senderId: string;
    timestamp: string;
    messageType: 'text' | 'voice' | 'image';
    isMine: boolean;
    status: 'sent' | 'delivered' | 'read';
}

function mapApiMessageToRow(raw: any, currentUserId: string): MessageRow {
    const id = raw.messageId ?? raw.message_id ?? raw.id ?? '';
    const senderId = raw.senderId ?? raw.sender_id ?? '';
    const isMine = senderId === currentUserId;
    const content = raw.content ?? '';
    const createdAt = raw.createdAt ?? raw.created_at;
    const timestamp = createdAt ? new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const readAt = raw.readAt ?? raw.read_at;
    const status: 'sent' | 'delivered' | 'read' = readAt ? 'read' : isMine ? 'delivered' : 'sent';
    const type = (raw.messageType ?? raw.message_type ?? 'TEXT').toLowerCase();
    return {
        id,
        content,
        senderId,
        timestamp,
        messageType: type === 'image' ? 'image' : type === 'audio' ? 'voice' : 'text',
        isMine,
        status,
    };
}

/**
 * Chat Screen - Individual conversation (real data from API)
 */
export const ChatScreen: React.FC = () => {
    const navigation = useNavigation<ChatScreenNavigationProp>();
    const route = useRoute<ChatScreenRouteProp>();
    const { conversationId: paramConversationId, participantName, participantId } = route.params;
    const dispatch = useAppDispatch();
    const currentUserId = useAppSelector((state) => state.auth.user?.userId) ?? '';
    const rawMessages = useAppSelector((state) => state.messages.messages);
    const [localConversationId, setLocalConversationId] = useState<string | undefined>(paramConversationId);
    const conversationId = localConversationId ?? paramConversationId;

    const messagesForConversation = conversationId ? (rawMessages[conversationId] ?? []) : [];
    const messages: MessageRow[] = useMemo(
        () => messagesForConversation.map((m: any) => mapApiMessageToRow(m, currentUserId)),
        [messagesForConversation, currentUserId]
    );

    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (conversationId) {
            dispatch(getMessages({ conversationId, limit: 100 }));
            dispatch(markAsRead(conversationId));
        }
    }, [conversationId, dispatch]);

    const { registerCommand } = useVoiceCommands('Chat');

    useEffect(() => {
        const unsub = registerCommand('send_message', () => {
            if (newMessage.trim()) handleSendMessage();
            else announceToScreenReader('No message to send. Type a message first.');
        });
        return () => { unsub?.(); };
    }, [newMessage, registerCommand]);

    useEffect(() => {
        if (!conversationId) return;
        const unsubMsg = websocketService.onMessage((event: MessageEvent) => {
            if (event.conversationId === conversationId) {
                dispatch(getMessages({ conversationId, limit: 100 }));
                announceToScreenReader(`New message from ${participantName}`);
            }
        });
        const unsubTyping = websocketService.onTyping((event: TypingEvent) => {
            if (event.conversationId === conversationId && event.userId !== currentUserId) {
                setIsTyping(event.isTyping);
                if (event.isTyping) announceToScreenReader(`${participantName} is typing`);
            }
        });
        return () => { unsubMsg?.(); unsubTyping?.(); };
    }, [conversationId, participantName, currentUserId, dispatch]);

    useEffect(() => {
        if (participantName && (messages.length > 0 || !conversationId)) {
            setTimeout(() => announceToScreenReader(`Chat with ${participantName}. ${messages.length} messages.`), 500);
        }
    }, [participantName, messages.length, conversationId]);

    useEffect(() => {
        if (messages.length > 0) setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, [messages.length]);

    const handleSendMessage = async () => {
        const content = newMessage.trim();
        if (!content || !participantId) return;
        setSending(true);
        setNewMessage('');
        try {
            const result = await dispatch(sendMessage({ recipientId: participantId, content })).unwrap();
            const convId = (result as any)?.conversationId ?? (result as any)?.conversation_id;
            if (convId && !conversationId) {
                setLocalConversationId(convId);
                dispatch(getMessages({ conversationId: convId, limit: 100 }));
            }
            websocketService.sendMessage(participantId, content, 'text');
            await announceToScreenReader('Message sent');
        } catch {
            setNewMessage(content);
            announceToScreenReader('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleVoiceRecord = async () => {
        if (isRecording) {
            const uri = await voiceRecordingService.stopRecording();
            setIsRecording(false);

            if (uri) {
                await announceToScreenReader('Voice recording stopped. Sending voice message.');
                // TODO: Upload voice file and send via WebSocket
                // websocketService.sendMessage(conversationId, uri, 'voice');
            }
        } else {
            const started = await voiceRecordingService.startRecording((status) => {
                // setRecordingDuration(status.duration);
            });

            if (started) {
                setIsRecording(true);
                await announceToScreenReader('Voice recording started. Tap stop to finish recording.');
            }
        }
    };

    const handleBack = () => {
        announceToScreenReader('Going back to messages');
        navigation.goBack();
    };

    const handleCall = () => {
        if (!participantId) {
            announceToScreenReader('Cannot start call until conversation is started');
            return;
        }
        const rootNav = (navigation.getParent() as any)?.getParent()?.getParent();
        if (rootNav) {
            rootNav.navigate('Call', {
                receiverId: participantId,
                receiverName: participantName || 'User',
                direction: 'outgoing' as const,
            });
            announceToScreenReader(`Starting voice call with ${participantName}`);
        }
    };

    const handleAttachment = () => {
        announceToScreenReader('Attachment options');
        // TODO: Show attachment picker
    };

    const renderMessage = ({ item }: { item: MessageRow }) => (
        <View style={[
            styles.messageContainer,
            item.isMine ? styles.myMessageContainer : styles.otherMessageContainer
        ]}>
            <View style={[
                styles.messageBubble,
                item.isMine ? styles.myMessageBubble : styles.otherMessageBubble
            ]}>
                <Text style={[
                    styles.messageText,
                    item.isMine ? styles.myMessageText : styles.otherMessageText
                ]}>
                    {item.content}
                </Text>
                <View style={styles.messageFooter}>
                    <Text style={[
                        styles.messageTime,
                        item.isMine ? styles.myMessageTime : styles.otherMessageTime
                    ]}>
                        {item.timestamp}
                    </Text>
                    {item.isMine && (
                        <Text style={styles.messageStatus}>
                            {item.status === 'sent' ? '✓' : item.status === 'delivered' ? '✓✓' : '✓✓'}
                        </Text>
                    )}
                </View>
            </View>
        </View>
    );

    const renderTypingIndicator = () => {
        if (!isTyping) return null;

        return (
            <View style={styles.typingContainer}>
                <Text style={styles.typingText} accessibilityRole="text">
                    {participantName} is typing...
                </Text>
            </View>
        );
    };

    useEffect(() => {
        if (!conversationId) return;
        if (!participantId) return;
        if (newMessage.trim()) websocketService.sendTyping(conversationId, participantId, true);
        else websocketService.sendTyping(conversationId, participantId, false);
    }, [newMessage, conversationId, participantId]);

    return (
        <SafeAreaView style={styles.container}>
            <OfflineBanner />
            {/* Header */}
            <View style={styles.header}>
                <AccessibleButton
                    title="Back"
                    onPress={handleBack}
                    variant="outline"
                    size="small"
                    accessibilityHint="Return to conversations list"
                    style={styles.backButton}
                    textStyle={styles.backButtonText}
                />
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle} accessibilityRole="header">
                        {participantName}
                    </Text>
                    <Text style={styles.headerSubtitle} accessibilityRole="text">
                        Online
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.headerAction}
                        onPress={handleCall}
                        accessibilityRole="button"
                        accessibilityLabel="Start voice call"
                        accessibilityHint="Double tap to start a voice call"
                    >
                        <Ionicons name="call" size={22} color={AppColors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerAction}
                        onPress={() => announceToScreenReader('More options')}
                        accessibilityRole="button"
                        accessibilityLabel="More options"
                        accessibilityHint="Open conversation options menu"
                    >
                        <Ionicons name="ellipsis-vertical" size={22} color={AppColors.white} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Messages List */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContainer}
                showsVerticalScrollIndicator={false}
                accessibilityLabel="Messages"
                ListFooterComponent={renderTypingIndicator}
            />

            {/* Message Input */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inputContainer}
            >
                <View style={styles.inputRow}>
                    <TouchableOpacity
                        style={styles.attachmentButton}
                        onPress={handleAttachment}
                        accessibilityRole="button"
                        accessibilityLabel="Add attachment"
                        accessibilityHint="Add photo, document, or other attachment"
                    >
                        <Ionicons name="add" size={24} color={AppColors.primary} />
                    </TouchableOpacity>

                    <View style={styles.textInputContainer}>
                        <TextInput
                            style={styles.textInput}
                            value={newMessage}
                            onChangeText={setNewMessage}
                            placeholder="Message"
                            placeholderTextColor={AppColors.placeholder}
                            multiline
                            maxLength={4000}
                            accessibilityLabel="Message input"
                            accessibilityHint="Type your message here"
                        />
                    </View>

                    {newMessage.trim() ? (
                        <AccessibleButton
                            title="Send"
                            onPress={handleSendMessage}
                            variant="primary"
                            size="small"
                            accessibilityHint="Send message"
                            style={styles.sendButton}
                            textStyle={styles.sendButtonText}
                        />
                    ) : (
                        <TouchableOpacity
                            style={[styles.voiceButton, isRecording && styles.recordingButton]}
                            onPress={handleVoiceRecord}
                            accessibilityRole="button"
                            accessibilityLabel={isRecording ? "Stop recording" : "Record voice message"}
                            accessibilityHint={isRecording ? "Release to send voice message" : "Hold to record voice message"}
                            accessibilityState={{ selected: isRecording }}
                        >
                            <Ionicons
                                name={isRecording ? "stop" : "mic"}
                                size={22}
                                color={isRecording ? AppColors.error : AppColors.primary}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: AppColors.primaryDark,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: AppColors.primary,
    },
    backButton: { marginRight: 12 },
    backButtonText: { fontSize: 14, color: AppColors.white },
    headerContent: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: AppColors.white },
    headerSubtitle: { fontSize: 12, color: AppColors.white, opacity: 0.9, marginTop: 2 },
    headerActions: { flexDirection: 'row' },
    headerAction: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    messagesList: { flex: 1 },
    messagesContainer: { paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 16 },
    messageContainer: { marginVertical: 2, maxWidth: '82%' },
    myMessageContainer: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    otherMessageContainer: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    messageBubble: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        maxWidth: 280,
    },
    myMessageBubble: { backgroundColor: AppColors.primary, borderTopRightRadius: 2 },
    otherMessageBubble: { backgroundColor: AppColors.borderLight, borderTopLeftRadius: 2 },
    messageText: { fontSize: 15, lineHeight: 20 },
    myMessageText: { color: AppColors.white },
    otherMessageText: { color: AppColors.text },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    messageTime: { fontSize: 11, marginRight: 4 },
    myMessageTime: { color: 'rgba(255,255,255,0.85)' },
    otherMessageTime: { color: AppColors.textSecondary },
    messageStatus: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
    typingContainer: { paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
    typingText: { fontSize: 14, color: AppColors.textSecondary, fontStyle: 'italic' },
    inputContainer: {
        backgroundColor: AppColors.background,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: AppColors.border,
        paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    attachmentButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: AppColors.inputBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    textInputContainer: {
        flex: 1,
        backgroundColor: AppColors.inputBg,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginRight: 8,
        maxHeight: 120,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    textInput: {
        fontSize: 16,
        color: AppColors.text,
        minHeight: 24,
        maxHeight: 100,
        padding: 0,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonText: { fontSize: 12, color: AppColors.white },
    voiceButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: AppColors.inputBg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordingButton: { backgroundColor: AppColors.error },
    recordingDuration: { fontSize: 10, color: AppColors.white, marginLeft: 4, fontWeight: '600' },
});
