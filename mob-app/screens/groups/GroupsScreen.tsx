import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    SectionList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { OfflineBanner } from '../../components/accessible/OfflineBanner';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import type { GroupsStackParamList } from '../../navigation/MainNavigator';

type GroupsScreenNavigationProp = NativeStackNavigationProp<GroupsStackParamList>;

interface Group {
    id: string;
    name: string;
    description: string;
    category: string;
    memberCount: number;
    isPublic: boolean;
    lastActivity: string;
    myRole?: 'member' | 'moderator' | 'admin';
    isJoined: boolean;
}

// Mock data for groups
const mockGroups: Group[] = [
    {
        id: '1',
        name: 'Blind Gamers Community',
        description: 'Connect with fellow gamers who are blind or visually impaired',
        category: 'Gaming',
        memberCount: 245,
        isPublic: true,
        lastActivity: '2 hours ago',
        myRole: 'member',
        isJoined: true,
    },
    {
        id: '2',
        name: 'Accessible Travel Tips',
        description: 'Share experiences and tips for accessible travel worldwide',
        category: 'Travel',
        memberCount: 189,
        isPublic: true,
        lastActivity: '5 hours ago',
        myRole: 'moderator',
        isJoined: true,
    },
    {
        id: '3',
        name: 'Music Lovers',
        description: 'Discuss music, share playlists, and connect through sound',
        category: 'Music',
        memberCount: 312,
        isPublic: true,
        lastActivity: '1 day ago',
        isJoined: false,
    },
    {
        id: '4',
        name: 'Tech Accessibility',
        description: 'Discuss latest tech and accessibility features',
        category: 'Technology',
        memberCount: 156,
        isPublic: false,
        lastActivity: '3 days ago',
        isJoined: false,
    },
];

/**
 * Groups Screen - WhatsApp-style groups list
 * Voice-first design for accessible community features
 */
export const GroupsScreen: React.FC = () => {
    const navigation = useNavigation<GroupsScreenNavigationProp>();
    const [groups, setGroups] = useState<Group[]>(mockGroups);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'joined' | 'discover'>('joined');

    // Separate groups into sections
    const joinedGroups = groups.filter(group => group.isJoined);
    const discoverGroups = groups.filter(group => !group.isJoined);

    const sections = [
        ...(joinedGroups.length > 0 ? [{
            title: 'My Groups',
            data: joinedGroups,
            key: 'joined'
        }] : []),
        {
            title: 'Discover Groups',
            data: discoverGroups,
            key: 'discover'
        }
    ];

    // Announce screen on load
    useEffect(() => {
        const announceScreen = async () => {
            setTimeout(async () => {
                await announceToScreenReader(
                    `Groups. ${joinedGroups.length} joined groups, ${discoverGroups.length} available to discover.`
                );
            }, 500);
        };

        announceScreen();
    }, [joinedGroups.length, discoverGroups.length]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await announceToScreenReader('Refreshing groups');

        // Simulate API call
        setTimeout(() => {
            setRefreshing(false);
            announceToScreenReader('Groups updated');
        }, 1000);
    };

    const handleGroupPress = async (group: Group) => {
        await announceToScreenReader(`Opening ${group.name} group chat`);
        // Navigate to group chat screen
        navigation.navigate('GroupChat', {
            groupId: group.id,
            groupName: group.name,
        });
    };

    const handleCreateGroup = () => {
        announceToScreenReader('Creating new group');
        navigation.navigate('CreateGroup');
    };

    const handleJoinGroup = async (group: Group) => {
        await announceToScreenReader(`Joining ${group.name}`);
        // TODO: Call join group API
        console.log('Join group:', group.id);
    };

    const renderGroupItem = ({ item }: { item: Group }) => (
        <TouchableOpacity
            style={styles.groupItem}
            onPress={() => handleGroupPress(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}. ${item.description}. ${item.memberCount} members. Category: ${item.category}. ${item.isPublic ? 'Public' : 'Private'} group. ${item.isJoined ? `Joined as ${item.myRole}` : 'Not joined'}. Last activity: ${item.lastActivity}`}
            accessibilityHint={item.isJoined ? "Double tap to open group" : "Double tap to view group details"}
        >
            <View style={styles.groupAvatar}>
                <Text style={styles.groupAvatarText}>
                    {item.name.charAt(0).toUpperCase()}
                </Text>
            </View>

            <View style={styles.groupContent}>
                <View style={styles.groupHeader}>
                    <Text style={styles.groupName} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <View style={styles.groupMeta}>
                        {!item.isPublic && (
                            <Ionicons name="lock-closed" size={12} color="#6C757D" style={styles.lockIcon} />
                        )}
                        <Text style={styles.memberCount}>
                            {item.memberCount}
                        </Text>
                    </View>
                </View>

                <Text style={styles.groupDescription} numberOfLines={2}>
                    {item.description}
                </Text>

                <View style={styles.groupFooter}>
                    <Text style={styles.categoryTag}>
                        {item.category}
                    </Text>
                    <Text style={styles.lastActivity}>
                        {item.lastActivity}
                    </Text>
                </View>
            </View>

            {!item.isJoined && (
                <AccessibleButton
                    title="Join"
                    onPress={() => handleJoinGroup(item)}
                    variant="primary"
                    size="small"
                    style={styles.joinButton}
                    textStyle={styles.joinButtonText}
                    accessibilityHint={`Join ${item.name} group`}
                />
            )}

            {item.isJoined && item.myRole === 'admin' && (
                <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderSectionHeader = ({ section }: { section: { title: string; data: Group[] } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
                {section.title}
            </Text>
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle} accessibilityRole="header">
                {activeTab === 'joined' ? 'No groups joined yet' : 'No groups to discover'}
            </Text>
            <Text style={styles.emptyDescription} accessibilityRole="text">
                {activeTab === 'joined'
                    ? 'Join groups to connect with people who share your interests.'
                    : 'Check back later for new groups in your community.'
                }
            </Text>
            {activeTab === 'joined' && (
                <AccessibleButton
                    title="Discover Groups"
                    onPress={() => setActiveTab('discover')}
                    variant="primary"
                    style={styles.discoverButton}
                    textStyle={styles.discoverButtonText}
                    accessibilityHint="Switch to discover tab to find groups to join"
                />
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <OfflineBanner />
            <View style={styles.header}>
                <Text style={styles.title} accessibilityRole="header">
                    Groups
                </Text>
                <AccessibleButton
                    title="Create"
                    onPress={handleCreateGroup}
                    variant="primary"
                    size="small"
                    accessibilityHint="Create a new group"
                    style={styles.createButton}
                    textStyle={styles.createButtonText}
                />
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'joined' && styles.activeTab]}
                    onPress={() => {
                        setActiveTab('joined');
                        announceToScreenReader('Switched to My Groups tab');
                    }}
                    accessibilityRole="tab"
                    accessibilityLabel={`My Groups. ${joinedGroups.length} groups`}
                    accessibilityState={{ selected: activeTab === 'joined' }}
                >
                    <Text style={[styles.tabText, activeTab === 'joined' && styles.activeTabText]}>
                        My Groups ({joinedGroups.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
                    onPress={() => {
                        setActiveTab('discover');
                        announceToScreenReader('Switched to Discover tab');
                    }}
                    accessibilityRole="tab"
                    accessibilityLabel={`Discover. ${discoverGroups.length} groups`}
                    accessibilityState={{ selected: activeTab === 'discover' }}
                >
                    <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
                        Discover ({discoverGroups.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <SectionList
                sections={activeTab === 'joined' ? sections.slice(0, 1) : sections.slice(-1)}
                keyExtractor={(item) => item.id}
                renderItem={renderGroupItem}
                renderSectionHeader={renderSectionHeader}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        accessibilityLabel="Pull to refresh groups"
                    />
                }
                style={styles.groupsList}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={false}
                accessibilityLabel="Groups list"
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
    createButton: {
        minWidth: 60,
    },
    createButtonText: {
        fontSize: 14,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F8F9FA',
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 8,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    activeTab: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6C757D',
    },
    activeTabText: {
        color: '#007AFF',
    },
    groupsList: {
        flex: 1,
    },
    sectionHeader: {
        backgroundColor: '#F8F9FA',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6C757D',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    groupItem: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E5',
        alignItems: 'center',
        minHeight: 80,
    },
    groupAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    groupAvatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    groupContent: {
        flex: 1,
        marginRight: 12,
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        flex: 1,
        marginRight: 8,
    },
    groupMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    lockIcon: {
        marginRight: 4,
    },
    memberCount: {
        fontSize: 12,
        color: '#6C757D',
    },
    groupDescription: {
        fontSize: 14,
        color: '#6C757D',
        lineHeight: 18,
        marginBottom: 8,
    },
    groupFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryTag: {
        fontSize: 12,
        color: '#007AFF',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        overflow: 'hidden',
    },
    lastActivity: {
        fontSize: 12,
        color: '#6C757D',
    },
    joinButton: {
        minWidth: 60,
    },
    joinButtonText: {
        fontSize: 12,
    },
    adminBadge: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    adminBadgeText: {
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
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 16,
        color: '#6C757D',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    discoverButton: {
        minWidth: 140,
    },
    discoverButtonText: {
        fontSize: 16,
    },
});
