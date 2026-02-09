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
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { OfflineBanner } from '../../components/accessible/OfflineBanner';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { groupsService, GroupMessage } from '../../services/api/groupsService';
import { useAppSelector } from '../../hooks';
import type { GroupsStackParamList } from '../../navigation/MainNavigator';

type GroupChatScreenNavigationProp = NativeStackNavigationProp<GroupsStackParamList, 'GroupChat'>;
type GroupChatScreenRouteProp = RouteProp<GroupsStackParamList, 'GroupChat'>;

/**
 * Group Chat Screen - WhatsApp-style group messaging (real API)
 * GET/POST /api/v1/groups/:groupId/messages
 */
export const GroupChatScreen: React.FC = () => {
    const navigation = useNavigation<GroupChatScreenNavigationProp>();
    const route = useRoute<GroupChatScreenRouteProp>();
    const { groupId, groupName } = route.params;
    const currentUserId = useAppSelector((state) => state.auth.user?.userId) ?? '';

    const [messages, setMessages] = useState<GroupMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);

    const loadMessages = async () => {
        if (!groupId) {
            setLoading(false);
            setRefreshing(false);
            setMessages([]);
            setError('Invalid group. Missing groupId.');
            return;
        }
        try {
            setError(null);
            const res = await groupsService.getGroupMessages({ groupId, limit: 100, offset: 0 });
            setMessages(res.items ?? []);
        } catch (e: any) {
            const message =
                e?.response?.data?.error?.message ??
                e?.response?.data?.message ??
                e?.message ??
                'Failed to load messages';
            setError(message);
            setMessages([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadMessages();
    }, [groupId]);

    useEffect(() => {
        if (messages.length > 0 || !loading) {
            setTimeout(() =>
                announceToScreenReader(`Group: ${groupName}. ${messages.length} messages.`)
                , 500);
        }
    }, [groupName, messages.length, loading]);

    useEffect(() => {
        if (messages.length > 0) setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, [messages.length]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadMessages();
    };

    const handleSend = async () => {
        const content = newMessage.trim();
        if (!content || sending) return;
        setSending(true);
        setNewMessage('');
        try {
            const sent = await groupsService.sendGroupMessage(groupId, content);
            setMessages((prev) => [...prev, sent]);
            announceToScreenReader('Message sent');
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (e: any) {
            setNewMessage(content);
            const message =
                e?.response?.data?.error?.message ??
                e?.response?.data?.message ??
                e?.message ??
                'Failed to send';
            setError(message);
            announceToScreenReader('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleBack = () => {
        announceToScreenReader('Going back to groups');
        navigation.goBack();
    };

    const senderName = (msg: GroupMessage) => {
        if (msg.senderId === currentUserId) return 'You';
        const s = msg.sender;
        if (!s) return 'Member';
        const first = s.firstName ?? '';
        const last = s.lastName ?? '';
        return [first, last].filter(Boolean).join(' ') || 'Member';
    };

    const formatTime = (dateStr: string) =>
        dateStr ? new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    const renderMessage = ({ item }: { item: GroupMessage }) => {
        const isMine = item.senderId === currentUserId;
        return (
            <View style={[styles.messageRow, isMine ? styles.myMessageRow : styles.otherMessageRow]}>
                {!isMine && (
                    <Text style={styles.senderName} numberOfLines={1}>
                        {senderName(item)}
                    </Text>
                )}
                <View style={[styles.bubble, isMine ? styles.myBubble : styles.otherBubble]}>
                    <Text style={[styles.bubbleText, isMine ? styles.myBubbleText : styles.otherBubbleText]}>
                        {item.content}
                    </Text>
                    <Text style={[styles.time, isMine ? styles.myTime : styles.otherTime]}>
                        {formatTime(item.createdAt)}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading && messages.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <AccessibleButton title="Back" onPress={handleBack} variant="outline" size="small" style={styles.backButton} textStyle={styles.backButtonText} />
                    <Text style={styles.headerTitle}>{groupName}</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={AppColors.primary} />
                    <Text style={styles.loadingText}>Loading messages...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <OfflineBanner />
            <View style={[styles.header, styles.headerWhatsApp]}>
                <AccessibleButton title="Back" onPress={handleBack} variant="outline" size="small" style={styles.backButton} textStyle={styles.backButtonText} />
                <Text style={styles.headerTitleWhite} numberOfLines={1}>{groupName}</Text>
            </View>

            {error ? (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.messageId}
                renderItem={renderMessage}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
                    </View>
                }
            />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inputWrap}>
                <View style={styles.inputRow}>
                    <View style={styles.inputBox}>
                        <TextInput
                            style={styles.input}
                            value={newMessage}
                            onChangeText={setNewMessage}
                            placeholder="Message"
                            placeholderTextColor={AppColors.placeholder}
                            multiline
                            maxLength={4000}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.sendBtn, (!newMessage.trim() || sending) && styles.sendBtnDisabled]}
                        onPress={handleSend}
                        disabled={!newMessage.trim() || sending}
                        accessibilityLabel="Send message"
                    >
                        <Ionicons name="send" size={22} color={AppColors.white} />
                    </TouchableOpacity>
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
        borderBottomWidth: 1,
        borderBottomColor: AppColors.border,
    },
    headerWhatsApp: { backgroundColor: AppColors.primaryDark },
    backButton: { marginRight: 12 },
    backButtonText: { fontSize: 14, color: AppColors.white },
    headerTitle: { fontSize: 18, fontWeight: '600', color: AppColors.text, flex: 1 },
    headerTitleWhite: { fontSize: 18, fontWeight: '600', color: AppColors.white, flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: AppColors.textSecondary },
    errorBanner: { backgroundColor: AppColors.errorBgLight, paddingHorizontal: 16, paddingVertical: 8 },
    errorText: { fontSize: 13, color: AppColors.error },
    list: { flex: 1 },
    listContent: { paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 16 },
    messageRow: { marginVertical: 2, maxWidth: '82%' },
    myMessageRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    otherMessageRow: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    senderName: { fontSize: 12, color: AppColors.primary, marginBottom: 2, marginLeft: 4 },
    bubble: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        maxWidth: 280,
    },
    myBubble: { backgroundColor: AppColors.primary, borderTopRightRadius: 2 },
    otherBubble: { backgroundColor: AppColors.borderLight, borderTopLeftRadius: 2 },
    bubbleText: { fontSize: 15, lineHeight: 20 },
    myBubbleText: { color: AppColors.white },
    otherBubbleText: { color: AppColors.text },
    time: { fontSize: 11, marginTop: 4, alignSelf: 'flex-end' },
    myTime: { color: 'rgba(255,255,255,0.85)' },
    otherTime: { color: AppColors.textSecondary },
    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
    emptyText: { fontSize: 15, color: AppColors.textSecondary },
    inputWrap: { backgroundColor: AppColors.background, borderTopWidth: 1, borderTopColor: AppColors.border, paddingBottom: Platform.OS === 'ios' ? 24 : 8 },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
    inputBox: { flex: 1, backgroundColor: AppColors.inputBg, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, minHeight: 42, maxHeight: 120 },
    input: { fontSize: 16, color: AppColors.text, minHeight: 26, maxHeight: 100 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: AppColors.primary, justifyContent: 'center', alignItems: 'center' },
    sendBtnDisabled: { opacity: 0.5 },
});
