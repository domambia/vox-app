import React, { useEffect, useState, useRef } from 'react';
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
    Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

type MainTabParamList = {
    Messages: undefined;
    Chat: { conversationId: string; participantName: string };
};

type ChatScreenNavigationProp = NativeStackNavigationProp<MainTabParamList, 'Chat'>;
type ChatScreenRouteProp = RouteProp<MainTabParamList, 'Chat'>;

interface Message {
    id: string;
    content: string;
    senderId: string;
    timestamp: string;
    messageType: 'text' | 'voice' | 'image';
    isMine: boolean;
    status: 'sent' | 'delivered' | 'read';
}

// Mock data for chat
const mockMessages: Message[] = [
    {
        id: '1',
        content: 'Hi there! How are you doing?',
        senderId: 'other',
        timestamp: '2:30 PM',
        messageType: 'text',
        isMine: false,
        status: 'read',
    },
    {
        id: '2',
        content: 'I\'m doing great! Thanks for asking. How about you?',
        senderId: 'me',
        timestamp: '2:31 PM',
        messageType: 'text',
        isMine: true,
        status: 'read',
    },
    {
        id: '3',
        content: 'Pretty good! Just finished some work. Want to chat about the upcoming event?',
        senderId: 'other',
        timestamp: '2:32 PM',
        messageType: 'text',
        isMine: false,
        status: 'read',
    },
    {
        id: '4',
        content: 'Absolutely! I\'m really looking forward to it.',
        senderId: 'me',
        timestamp: '2:33 PM',
        messageType: 'text',
        isMine: true,
        status: 'delivered',
    },
];

/**
 * Chat Screen - WhatsApp-style individual conversation
 * Voice-first design with accessible messaging interface
 */
export const ChatScreen: React.FC = () => {
    const navigation = useNavigation<ChatScreenNavigationProp>();
    const route = useRoute<ChatScreenRouteProp>();
    const { conversationId, participantName } = route.params;

    const [messages, setMessages] = useState<Message[]>(mockMessages);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // Announce screen on load
    useEffect(() => {
        const announceScreen = async () => {
            setTimeout(async () => {
                await announceToScreenReader(
                    `Chat with ${participantName}. ${messages.length} messages.`
                );
            }, 500);
        };

        announceScreen();
    }, [participantName, messages.length]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        const message: Message = {
            id: Date.now().toString(),
            content: newMessage.trim(),
            senderId: 'me',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messageType: 'text',
            isMine: true,
            status: 'sent',
        };

        setMessages(prev => [...prev, message]);
        setNewMessage('');

        await announceToScreenReader('Message sent');

        // Simulate message being delivered
        setTimeout(() => {
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === message.id ? { ...msg, status: 'delivered' as const } : msg
                )
            );
        }, 1000);
    };

    const handleVoiceRecord = async () => {
        if (isRecording) {
            setIsRecording(false);
            await announceToScreenReader('Voice recording stopped. Sending voice message.');
            // TODO: Send voice message
        } else {
            setIsRecording(true);
            await announceToScreenReader('Voice recording started. Hold to record, release to send.');
        }
    };

    const handleBack = () => {
        announceToScreenReader('Going back to messages');
        navigation.goBack();
    };

    const handleAttachment = () => {
        announceToScreenReader('Attachment options');
        // TODO: Show attachment picker
    };

    const renderMessage = ({ item }: { item: Message }) => (
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

    return (
        <SafeAreaView style={styles.container}>
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
                        onPress={() => announceToScreenReader('Call options')}
                        accessibilityRole="button"
                        accessibilityLabel="Call options"
                        accessibilityHint="Open call options menu"
                    >
                        <Ionicons name="call" size={20} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerAction}
                        onPress={() => announceToScreenReader('More options')}
                        accessibilityRole="button"
                        accessibilityLabel="More options"
                        accessibilityHint="Open conversation options menu"
                    >
                        <Ionicons name="ellipsis-vertical" size={20} color="#007AFF" />
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
                        <Ionicons name="add" size={24} color="#007AFF" />
                    </TouchableOpacity>

                    <View style={styles.textInputContainer}>
                        <TextInput
                            style={styles.textInput}
                            value={newMessage}
                            onChangeText={setNewMessage}
                            placeholder="Type a message..."
                            placeholderTextColor="#6C757D"
                            multiline
                            maxLength={1000}
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
                                size={20}
                                color={isRecording ? "#FF3B30" : "#007AFF"}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E5E5E5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    backButton: {
        marginRight: 12,
    },
    backButtonText: {
        fontSize: 14,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#6C757D',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
    },
    headerAction: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    messagesList: {
        flex: 1,
    },
    messagesContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    messageContainer: {
        marginVertical: 2,
        maxWidth: '80%',
    },
    myMessageContainer: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    otherMessageContainer: {
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
    },
    messageBubble: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        maxWidth: 280,
    },
    myMessageBubble: {
        backgroundColor: '#007AFF',
    },
    otherMessageBubble: {
        backgroundColor: '#FFFFFF',
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    myMessageText: {
        color: '#FFFFFF',
    },
    otherMessageText: {
        color: '#000000',
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    messageTime: {
        fontSize: 11,
        marginRight: 4,
    },
    myMessageTime: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    otherMessageTime: {
        color: '#6C757D',
    },
    messageStatus: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.7)',
    },
    typingContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignSelf: 'flex-start',
    },
    typingText: {
        fontSize: 14,
        color: '#6C757D',
        fontStyle: 'italic',
    },
    inputContainer: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    attachmentButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    textInputContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        marginRight: 8,
        maxHeight: 100,
    },
    textInput: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 16,
        color: '#000000',
        minHeight: 36,
        maxHeight: 80,
    },
    sendButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    sendButtonText: {
        fontSize: 12,
    },
    voiceButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordingButton: {
        backgroundColor: '#FF3B30',
    },
});
