import React, { useEffect, useState } from 'react';
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
        setSearchMode(!searchMode);
        announceToScreenReader(searchMode ? 'Search mode closed' : 'Search mode opened');
    };

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
            <Text style={styles.emptyTitle} accessibilityRole="header">
                No conversations yet
            </Text>
            <Text style={styles.emptyDescription} accessibilityRole="text">
                Start connecting with people in your community.
                {'\n'}Find matches in the Discover tab.
            </Text>
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
                <View style={styles.searchContainer}>
                    <Text style={styles.searchPlaceholder} accessibilityRole="text">
                        Search conversations...
                    </Text>
                    {/* TODO: Add search input */}
                </View>
            )}

            <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                renderItem={renderConversationItem}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        accessibilityLabel="Pull to refresh conversations"
                    />
                }
                style={styles.conversationsList}
                showsVerticalScrollIndicator={false}
                accessibilityLabel="Conversations list"
            />
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
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        backgroundColor: '#F8F9FA',
    },
    searchPlaceholder: {
        fontSize: 16,
        color: '#6C757D',
        fontStyle: 'italic',
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
    },
});
