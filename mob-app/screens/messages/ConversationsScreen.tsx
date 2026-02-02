import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { listConversations } from '../../store/slices/messagesSlice';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { AccessibleSearchInput } from '../../components/accessible/AccessibleSearchInput';
import { LoadingSkeleton } from '../../components/accessible/LoadingSkeleton';
import { ErrorView } from '../../components/accessible/ErrorView';
import { OfflineBanner } from '../../components/accessible/OfflineBanner';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';

type ConversationsScreenNavigationProp = NativeStackNavigationProp<import('../../navigation/MainNavigator').MessagesStackParamList>;

/** UI row for a conversation (from API or mapped) */
interface ConversationRow {
    id: string;
    participantId: string;
    participantName: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
}

function formatConversationTime(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
}

function mapConversationFromApi(conv: any): ConversationRow {
    const id = conv.conversationId ?? conv.conversation_id ?? '';
    const other = conv.other_user ?? conv.participant;
    const firstName = other?.first_name ?? other?.firstName ?? '';
    const lastName = other?.last_name ?? other?.lastName ?? '';
    const participantName = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';
    const participantId = other?.user_id ?? other?.userId ?? '';
    const lastMsg = conv.last_message ?? conv.lastMessage;
    const lastMessage = lastMsg?.content ?? '';
    const lastMessageAt = conv.last_message_at ?? conv.lastMessageAt ?? lastMsg?.created_at ?? lastMsg?.createdAt;
    const unreadCount = conv.unread_count ?? conv.unreadCount ?? 0;
    return {
        id,
        participantId,
        participantName,
        lastMessage,
        lastMessageTime: formatConversationTime(lastMessageAt),
        unreadCount,
    };
}

/**
 * Conversations Screen - WhatsApp-style chat list (real data from API)
 */
export const ConversationsScreen: React.FC = () => {
    const navigation = useNavigation<ConversationsScreenNavigationProp>();
    const dispatch = useAppDispatch();
    const { conversations: rawConversations, isLoading, error } = useAppSelector((state) => state.messages);
    const [refreshing, setRefreshing] = useState(false);
    const [searchMode, setSearchMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const conversations: ConversationRow[] = useMemo(
        () => (Array.isArray(rawConversations) ? rawConversations.map(mapConversationFromApi) : []),
        [rawConversations]
    );

    useEffect(() => {
        dispatch(listConversations({ limit: 50 }));
    }, [dispatch]);

    useEffect(() => {
        if (conversations.length > 0 || !isLoading) {
            setTimeout(() => {
                announceToScreenReader(
                    `Messages. ${conversations.length} conversations. Double tap any conversation to open chat.`
                );
            }, 500);
        }
    }, [conversations.length, isLoading]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await announceToScreenReader('Refreshing conversations');
        await dispatch(listConversations({ limit: 50 }));
        setRefreshing(false);
        announceToScreenReader('Conversations updated');
    };

    const handleConversationPress = async (conversation: ConversationRow) => {
        await announceToScreenReader(`Opening chat with ${conversation.participantName}`);
        navigation.navigate('Chat', {
            conversationId: conversation.id,
            participantName: conversation.participantName,
            participantId: conversation.participantId,
        });
    };

    const handleSearch = () => {
        const newSearchMode = !searchMode;
        setSearchMode(newSearchMode);
        if (!newSearchMode) {
            setSearchQuery('');
        }
        announceToScreenReader(newSearchMode ? 'Search mode opened' : 'Search mode closed');
    };

    // Filter conversations based on search query
    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) {
            return conversations;
        }
        const query = searchQuery.toLowerCase();
        return conversations.filter(
            (conv) =>
                conv.participantName.toLowerCase().includes(query) ||
                conv.lastMessage.toLowerCase().includes(query)
        );
    }, [conversations, searchQuery]);

    // Announce search results
    useEffect(() => {
        if (searchMode && searchQuery.trim()) {
            const count = filteredConversations.length;
            announceToScreenReader(
                count > 0
                    ? `Found ${count} ${count === 1 ? 'conversation' : 'conversations'}`
                    : 'No conversations found'
            );
        }
    }, [filteredConversations.length, searchQuery, searchMode]);

    const renderConversationItem = ({ item }: { item: ConversationRow }) => (
        <TouchableOpacity
            style={styles.conversationItem}
            onPress={() => handleConversationPress(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.participantName}. ${item.unreadCount > 0 ? `${item.unreadCount} unread messages. ` : ''}Last message: ${item.lastMessage || 'No messages'}. ${item.lastMessageTime}`}
            accessibilityHint="Double tap to open conversation"
        >
            <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {item.participantName.charAt(0).toUpperCase() || '?'}
                    </Text>
                </View>
            </View>

            <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                    <Text style={styles.participantName} numberOfLines={1}>
                        {item.participantName}
                    </Text>
                    <Text style={styles.timestamp}>
                        {item.lastMessageTime}
                    </Text>
                </View>

                <View style={styles.messageRow}>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {item.lastMessage}
                    </Text>
                    {item.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadCount}>
                                {item.unreadCount > 99 ? '99+' : item.unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={AppColors.textSecondary} />
            <Text style={styles.emptyTitle} accessibilityRole="header">
                No conversations yet
            </Text>
            <Text style={styles.emptyDescription} accessibilityRole="text">
                Start connecting with people in your community.
                {'\n'}Find matches in the Discover tab.
            </Text>
            <View style={styles.emptyTips}>
                <Text style={styles.tipTitle} accessibilityRole="header">
                    How to start conversations:
                </Text>
                <Text style={styles.tipItem} accessibilityRole="text">
                    • Like profiles in Discover to get matches
                </Text>
                <Text style={styles.tipItem} accessibilityRole="text">
                    • Send a message to your matches
                </Text>
                <Text style={styles.tipItem} accessibilityRole="text">
                    • Join groups to meet new people
                </Text>
                <Text style={styles.tipItem} accessibilityRole="text">
                    • Attend events to connect with others
                </Text>
            </View>
            <AccessibleButton
                title="Go to Discover"
                onPress={() => {
                    announceToScreenReader('Navigating to discover');
                    const rootNavigation = navigation.getParent()?.getParent();
                    if (rootNavigation) {
                        rootNavigation.navigate('Discover');
                    }
                }}
                variant="primary"
                style={styles.discoverButton}
                textStyle={styles.discoverButtonText}
                accessibilityHint="Go to discover screen to find matches"
            />
        </View>
    );



    return (
        <SafeAreaView style={styles.container}>
            <OfflineBanner />
            <View style={styles.header}>
                <Text style={styles.title} accessibilityRole="header">
                    Messages
                </Text>
                <AccessibleButton
                    title={searchMode ? 'Cancel' : 'Search'}
                    onPress={handleSearch}
                    variant="outline"
                    size="small"
                    accessibilityHint={searchMode ? 'Cancel search' : 'Search conversations'}
                    style={styles.headerButton}
                    textStyle={styles.headerButtonText}
                />
            </View>

            {searchMode && (
                <AccessibleSearchInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search conversations..."
                    onClear={() => setSearchQuery('')}
                    accessibilityLabel="Search conversations"
                    accessibilityHint="Type to search conversations by name or message"
                />
            )}

            {isLoading ? (
                <LoadingSkeleton type="list" />
            ) : error ? (
                <ErrorView message={error} onRetry={handleRefresh} />
            ) : (
                <FlatList
                    data={filteredConversations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderConversationItem}
                    ListEmptyComponent={
                        searchQuery.trim()
                            ? () => (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyTitle} accessibilityRole="header">
                                        No conversations found
                                    </Text>
                                    <Text style={styles.emptyDescription} accessibilityRole="text">
                                        No conversations match "{searchQuery}".{'\n'}
                                        Try a different search term.
                                    </Text>
                                </View>
                            )
                            : renderEmptyState
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            accessibilityLabel="Pull to refresh conversations"
                        />
                    }
                    style={styles.conversationsList}
                    showsVerticalScrollIndicator={false}
                    accessibilityLabel={
                        searchQuery.trim()
                            ? `Search results: ${filteredConversations.length} conversations`
                            : 'Conversations list'
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: AppColors.primaryDark,
        borderBottomWidth: 0,
    },
    title: {
        fontSize: 22,
        fontWeight: '600',
        color: AppColors.white,
    },
    headerButton: {
        minWidth: 60,
    },
    headerButtonText: {
        fontSize: 14,
        color: AppColors.white,
    },
    conversationsList: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    conversationItem: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: AppColors.border,
        minHeight: 72,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 14,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: AppColors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: AppColors.textSecondary,
    },
    onlineIndicator: {
        borderWidth: 2,
        borderColor: AppColors.primary,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: AppColors.primary,
        borderWidth: 2,
        borderColor: AppColors.white,
    },
    conversationContent: {
        flex: 1,
        justifyContent: 'center',
    },
    conversationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    participantName: {
        fontSize: 17,
        fontWeight: '500',
        color: AppColors.text,
        flex: 1,
        marginRight: 8,
    },
    timestamp: {
        fontSize: 12,
        color: AppColors.textSecondary,
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    lastMessage: {
        fontSize: 14,
        color: AppColors.textSecondary,
        flex: 1,
        marginRight: 8,
    },
    unreadBadge: {
        backgroundColor: AppColors.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadCount: {
        fontSize: 12,
        fontWeight: '600',
        color: AppColors.white,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: AppColors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 16,
        color: AppColors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 16,
    },
    emptyTips: {
        marginTop: 16,
        marginBottom: 24,
        paddingHorizontal: 16,
        alignItems: 'flex-start',
        width: '100%',
    },
    tipTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: AppColors.text,
        marginBottom: 8,
    },
    tipItem: {
        fontSize: 14,
        color: AppColors.textSecondary,
        lineHeight: 20,
        marginBottom: 4,
    },
    discoverButton: {
        minWidth: 160,
        marginTop: 8,
    },
    discoverButtonText: {
        fontSize: 16,
    },
});
