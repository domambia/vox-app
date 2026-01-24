import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppSelector } from '../../hooks';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { AccessibleSearchInput } from '../../components/accessible/AccessibleSearchInput';
import { LoadingSkeleton } from '../../components/accessible/LoadingSkeleton';
import { ErrorView } from '../../components/accessible/ErrorView';
import { Ionicons } from '@expo/vector-icons';

type ConversationsScreenNavigationProp = NativeStackNavigationProp<import('../../navigation/MainNavigator').MessagesStackParamList>;

// Mock data for conversations
interface Conversation {
    id: string;
    participantName: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
    isOnline: boolean;
    avatar?: string;
}

const mockConversations: Conversation[] = [
    {
        id: '1',
        participantName: 'Sarah Johnson',
        lastMessage: 'Hey! How are you doing?',
        lastMessageTime: '2:30 PM',
        unreadCount: 2,
        isOnline: true,
    },
    {
        id: '2',
        participantName: 'Mike Chen',
        lastMessage: 'Thanks for the great conversation!',
        lastMessageTime: '1:15 PM',
        unreadCount: 0,
        isOnline: false,
    },
    {
        id: '3',
        participantName: 'Emma Davis',
        lastMessage: 'See you at the event tomorrow!',
        lastMessageTime: 'Yesterday',
        unreadCount: 1,
        isOnline: true,
    },
    {
        id: '4',
        participantName: 'James Wilson',
        lastMessage: 'Voice message',
        lastMessageTime: 'Yesterday',
        unreadCount: 0,
        isOnline: false,
    },
];

/**
 * Conversations Screen - WhatsApp-style chat list
 * Voice-first design for accessible messaging
 */
export const ConversationsScreen: React.FC = () => {
    const navigation = useNavigation<ConversationsScreenNavigationProp>();
    const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
    const [refreshing, setRefreshing] = useState(false);
    const [searchMode, setSearchMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Announce screen on load
    useEffect(() => {
        const announceScreen = async () => {
            setTimeout(async () => {
                await announceToScreenReader(
                    `Messages. ${conversations.length} conversations. Double tap any conversation to open chat.`
                );
            }, 500);
        };

        announceScreen();
    }, [conversations.length]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await announceToScreenReader('Refreshing conversations');

        // Simulate API call
        setTimeout(() => {
            setRefreshing(false);
            announceToScreenReader('Conversations updated');
        }, 1000);
    };

    const handleConversationPress = async (conversation: Conversation) => {
        await announceToScreenReader(`Opening chat with ${conversation.participantName}`);
        // Navigate to chat screen
        navigation.navigate('Chat', {
            conversationId: conversation.id,
            participantName: conversation.participantName,
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

    const renderConversationItem = ({ item }: { item: Conversation }) => (
        <TouchableOpacity
            style={styles.conversationItem}
            onPress={() => handleConversationPress(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.participantName}. ${item.unreadCount > 0 ? `${item.unreadCount} unread messages. ` : ''}Last message: ${item.lastMessage}. ${item.lastMessageTime}. ${item.isOnline ? 'Online' : 'Offline'}`}
            accessibilityHint="Double tap to open conversation"
        >
            <View style={styles.avatarContainer}>
                <View style={[styles.avatar, item.isOnline && styles.onlineIndicator]}>
                    <Text style={styles.avatarText}>
                        {item.participantName.charAt(0).toUpperCase()}
                    </Text>
                </View>
                {item.isOnline && <View style={styles.onlineDot} />}
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
            <Ionicons name="chatbubbles-outline" size={64} color="#CCCCCC" />
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
                <ErrorView message={error} onRetry={() => setError(null)} />
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
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#000000',
    },
    headerButton: {
        minWidth: 60,
    },
    headerButtonText: {
        fontSize: 14,
    },
    conversationsList: {
        flex: 1,
    },
    conversationItem: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E5',
        minHeight: 72, // Ensure touch targets are adequate
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    onlineIndicator: {
        borderWidth: 2,
        borderColor: '#34C759',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#34C759',
        borderWidth: 2,
        borderColor: '#FFFFFF',
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
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        flex: 1,
        marginRight: 8,
    },
    timestamp: {
        fontSize: 12,
        color: '#6C757D',
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    lastMessage: {
        fontSize: 14,
        color: '#6C757D',
        flex: 1,
        marginRight: 8,
    },
    unreadBadge: {
        backgroundColor: '#007AFF',
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
        color: '#FFFFFF',
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
        color: '#000000',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 16,
        color: '#6C757D',
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
        color: '#000000',
        marginBottom: 8,
    },
    tipItem: {
        fontSize: 14,
        color: '#6C757D',
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
