import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    RefreshControl,
    SectionList,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { OfflineBanner } from '../../components/accessible/OfflineBanner';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import type { GroupsStackParamList } from '../../navigation/MainNavigator';
import { groupsService } from '../../services/api/groupsService';
import { useAppSelector } from '../../hooks';

type GroupsScreenNavigationProp = NativeStackNavigationProp<GroupsStackParamList>;

interface GroupRow {
    id: string;
    name: string;
    description: string;
    category: string;
    memberCount: number;
    isPublic: boolean;
    lastActivity: string;
    lastMessagePreview?: string;
    lastMessageAt?: string;
    myRole?: 'member' | 'moderator' | 'admin';
    isJoined: boolean;
}

function formatRelative(dateStr: string | undefined): string {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

function mapApiGroupToRow(raw: any, isJoined: boolean, myRole?: string): GroupRow {
    const g = raw.group ?? raw;
    const id = g.group_id ?? g.groupId ?? '';
    const memberCount = g.member_count ?? g.memberCount ?? 0;
    const isPublic = g.is_public !== false;
    const role = (raw.role ?? myRole ?? '').toLowerCase();
    const lastAt = g.last_message_at ?? g.lastMessageAt ?? g.updated_at ?? g.updatedAt;
    return {
        id,
        name: g.name ?? '',
        description: g.description ?? '',
        category: g.category ?? 'General',
        memberCount,
        isPublic,
        lastActivity: formatRelative(lastAt),
        lastMessagePreview: g.last_message_preview ?? g.lastMessagePreview,
        lastMessageAt: lastAt,
        myRole: role ? (role as GroupRow['myRole']) : undefined,
        isJoined,
    };
}

/**
 * Groups Screen - Groups list (real data from API)
 */
export const GroupsScreen: React.FC = () => {
    const navigation = useNavigation<GroupsScreenNavigationProp>();
    const userId = useAppSelector((state) => state.auth.user?.userId) ?? '';
    const [joinedGroups, setJoinedGroups] = useState<GroupRow[]>([]);
    const [discoverGroups, setDiscoverGroups] = useState<GroupRow[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'joined' | 'discover'>('joined');

    const loadGroups = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const [myRes, listRes] = await Promise.all([
                groupsService.getUserGroups(userId),
                groupsService.listGroups({ limit: 50 }),
            ]);
            const myItems = Array.isArray(myRes.groups) ? myRes.groups : [];
            const joined = myItems.map((m: any) => mapApiGroupToRow(m, true, m.role));
            setJoinedGroups(joined);
            const myIds = new Set(joined.map((g) => g.id));
            const listItems = Array.isArray(listRes.data) ? listRes.data : [];
            const discover = listItems
                .filter((g: any) => !myIds.has(g.group_id ?? g.groupId ?? ''))
                .map((g: any) => mapApiGroupToRow(g, false));
            setDiscoverGroups(discover);
        } catch {
            setJoinedGroups([]);
            setDiscoverGroups([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGroups();
    }, [userId]);

    useEffect(() => {
        if (joinedGroups.length > 0 || discoverGroups.length > 0 || !loading) {
            setTimeout(() => announceToScreenReader(
                `Groups. ${joinedGroups.length} joined groups, ${discoverGroups.length} available to discover.`
            ), 500);
        }
    }, [joinedGroups.length, discoverGroups.length, loading]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await announceToScreenReader('Refreshing groups');
        await loadGroups();
        setRefreshing(false);
        announceToScreenReader('Groups updated');
    };

    const handleGroupPress = async (group: GroupRow) => {
        if (!group.id) {
            await announceToScreenReader('Unable to open group chat. Missing group ID.');
            return;
        }
        await announceToScreenReader(`Opening ${group.name} group chat`);
        navigation.navigate('GroupChat', {
            groupId: group.id,
            groupName: group.name,
        });
    };

    const handleCreateGroup = () => {
        announceToScreenReader('Creating new group');
        navigation.navigate('CreateGroup');
    };

    const handleJoinGroup = async (group: GroupRow) => {
        try {
            await groupsService.joinGroup(group.id);
            await announceToScreenReader(`Joined ${group.name}`);
            await loadGroups();
        } catch (e: any) {
            await announceToScreenReader(e?.response?.data?.error?.message ?? 'Failed to join group');
        }
    };

    const sections = [
        ...(joinedGroups.length > 0 ? [{ title: 'My Groups', data: joinedGroups, key: 'joined' }] : []),
        { title: 'Discover Groups', data: discoverGroups, key: 'discover' },
    ];

    const renderGroupItem = ({ item }: { item: GroupRow }) => (
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
                            <Ionicons name="lock-closed" size={12} color={AppColors.textSecondary} style={styles.lockIcon} />
                        )}
                        <Text style={styles.memberCount}>
                            {item.memberCount}
                        </Text>
                    </View>
                </View>

                {(item.lastMessagePreview != null && item.lastMessagePreview !== '') ? (
                    <Text style={styles.lastMessagePreview} numberOfLines={1}>
                        {item.lastMessagePreview}
                    </Text>
                ) : (
                    <Text style={styles.groupDescription} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}

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

    const renderSectionHeader = ({ section }: { section: { title: string; data: GroupRow[] } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
                {section.title}
            </Text>
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={AppColors.border} />
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

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={AppColors.primary} />
                    <Text style={styles.loadingText}>Loading groups...</Text>
                </View>
            ) : (
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
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: AppColors.border,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: AppColors.text,
    },
    createButton: {
        minWidth: 60,
    },
    createButtonText: {
        fontSize: 14,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: AppColors.inputBg,
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
        backgroundColor: AppColors.background,
        shadowColor: AppColors.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: AppColors.textSecondary,
    },
    activeTabText: {
        color: AppColors.primary,
    },
    groupsList: {
        flex: 1,
    },
    sectionHeader: {
        backgroundColor: AppColors.inputBg,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: AppColors.border,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: AppColors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    groupItem: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: AppColors.border,
        alignItems: 'center',
        minHeight: 80,
    },
    groupAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    groupAvatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: AppColors.white,
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
        color: AppColors.text,
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
        color: AppColors.textSecondary,
    },
    groupDescription: {
        fontSize: 14,
        color: AppColors.textSecondary,
        lineHeight: 18,
        marginBottom: 8,
    },
    lastMessagePreview: {
        fontSize: 14,
        color: AppColors.textSecondary,
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
        color: AppColors.primary,
        backgroundColor: AppColors.borderLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        overflow: 'hidden',
    },
    lastActivity: {
        fontSize: 12,
        color: AppColors.textSecondary,
    },
    joinButton: {
        minWidth: 60,
    },
    joinButtonText: {
        fontSize: 12,
    },
    adminBadge: {
        backgroundColor: AppColors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    adminBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: AppColors.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 16,
        color: AppColors.textSecondary,
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
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 16,
        color: AppColors.textSecondary,
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
