import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { OfflineBanner } from '../../components/accessible/OfflineBanner';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { eventsService } from '../../services/api/eventsService';
import { useAppSelector } from '../../hooks';

type MainTabParamList = {
    Events: undefined;
    CreateEvent: undefined;
    EventDetail: { eventId: string };
};

type EventsScreenNavigationProp = NativeStackNavigationProp<MainTabParamList>;

interface EventRow {
    id: string;
    title: string;
    description: string;
    dateTime: string;
    location: string;
    accessibilityNotes?: string;
    attendeeCount: number;
    maxAttendees?: number;
    creatorName: string;
    groupName?: string;
    isAttending: boolean;
    isCreator: boolean;
}

function mapApiEventToRow(raw: any, isAttending: boolean = false, currentUserId?: string): EventRow {
    const e = raw.event ?? raw;
    const id = e.event_id ?? e.eventId ?? e.id ?? '';
    const creator = e.creator ?? {};
    const creatorName = [creator.first_name ?? creator.firstName, creator.last_name ?? creator.lastName].filter(Boolean).join(' ') || 'Unknown';
    const group = e.group ?? {};
    const groupName = group.name;
    return {
        id,
        title: e.title ?? '',
        description: e.description ?? '',
        dateTime: e.date_time ?? e.startTime ?? e.start_time ?? e.dateTime ?? '',
        location: e.location ?? '',
        accessibilityNotes: e.accessibility_notes ?? e.accessibilityNotes,
        attendeeCount: e.attendee_count ?? e.attendeeCount ?? 0,
        maxAttendees: e.max_attendees ?? e.maxAttendees,
        creatorName,
        groupName,
        isAttending,
        isCreator: (e.creator_id ?? e.creatorId) === currentUserId,
    };
}

/**
 * Events Screen - Accessible events list with RSVP functionality
 * Voice-first design for event discovery and management
 */
export const EventsScreen: React.FC = () => {
    const navigation = useNavigation<EventsScreenNavigationProp>();
    const userId = useAppSelector((state) => state.auth.user?.userId) ?? '';
    const [events, setEvents] = useState<EventRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'attending' | 'upcoming'>('all');

    const loadEvents = async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [listRes, userRes] = await Promise.all([
                eventsService.listEvents({ limit: 50, upcomingOnly: true }),
                eventsService.getUserEvents(userId, { upcomingOnly: true }),
            ]);
            const listItems = Array.isArray(listRes.data) ? listRes.data : [];
            const attendingEventIds = new Set(
                (userRes.events ?? []).map((x: any) => x.event?.event_id ?? x.event?.eventId ?? x.event_id)
            );
            const rows = listItems.map((raw: any) =>
                mapApiEventToRow(raw, attendingEventIds.has(raw.event_id ?? raw.eventId ?? raw.id ?? ''), userId)
            );
            setEvents(rows);
        } catch {
            setEvents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, [userId]);

    // Announce screen on load
    useEffect(() => {
        const announceScreen = async () => {
            setTimeout(async () => {
                const filteredEvents = getFilteredEvents();
                await announceToScreenReader(
                    `Events screen. ${filteredEvents.length} events. ${filter === 'all' ? 'All events' : filter === 'attending' ? 'My events' : 'Upcoming events'}.`
                );
            }, 500);
        };

        announceScreen();
    }, [events.length, filter]);

    const getFilteredEvents = (): EventRow[] => {
        switch (filter) {
            case 'attending':
                return events.filter(event => event.isAttending);
            case 'upcoming':
                return events.filter(event => new Date(event.dateTime) > new Date());
            default:
                return events;
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await announceToScreenReader('Refreshing events');
        await loadEvents();
        setRefreshing(false);
        announceToScreenReader('Events updated');
    };

    const handleEventPress = async (event: EventRow) => {
        await announceToScreenReader(`Opening ${event.title} event details`);
        navigation.navigate('EventDetail', { eventId: event.id });
    };

    const handleCreateEvent = () => {
        announceToScreenReader('Creating new event');
        navigation.navigate('CreateEvent' as any);
    };

    const handleRSVP = async (event: EventRow) => {
        const newAttendingStatus = !event.isAttending;
        try {
            await eventsService.rsvpToEvent(event.id, {
                status: newAttendingStatus ? 'going' : 'not_going',
            });
            await announceToScreenReader(
                newAttendingStatus
                    ? `RSVP confirmed for ${event.title}`
                    : `Cancelled RSVP for ${event.title}`
            );
            setEvents(prev =>
                prev.map(e =>
                    e.id === event.id
                        ? { ...e, isAttending: newAttendingStatus, attendeeCount: e.attendeeCount + (newAttendingStatus ? 1 : -1) }
                        : e
                )
            );
        } catch {
            await announceToScreenReader('Failed to update RSVP');
        }
    };

    const handleFilterChange = (newFilter: typeof filter) => {
        setFilter(newFilter);
        const filterName = newFilter === 'all' ? 'All events' :
            newFilter === 'attending' ? 'My events' :
                'Upcoming events';
        announceToScreenReader(`Filtered to ${filterName.toLowerCase()}`);
    };

    const formatDateTime = (dateTime: string) => {
        const date = new Date(dateTime);
        const now = new Date();
        const diffTime = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays === 1) {
            return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays < 7) {
            return `${date.toLocaleDateString([], { weekday: 'long' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
    };

    const renderEventItem = ({ item }: { item: EventRow }) => (
        <TouchableOpacity
            style={styles.eventItem}
            onPress={() => handleEventPress(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${formatDateTime(item.dateTime)}. At ${item.location}. ${item.attendeeCount} attending${item.maxAttendees ? ` of ${item.maxAttendees}` : ''}. ${item.isAttending ? 'You are attending' : 'Not attending'}. ${item.accessibilityNotes ? 'Has accessibility notes' : ''}`}
            accessibilityHint="Double tap to view event details"
        >
            <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                        {item.title}
                    </Text>
                    {item.isCreator && (
                        <View style={styles.creatorBadge}>
                            <Text style={styles.creatorBadgeText}>Host</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.eventDescription} numberOfLines={2}>
                    {item.description}
                </Text>

                <View style={styles.eventDetails}>
                    <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={16} color={AppColors.textSecondary} />
                        <Text style={styles.detailText}>
                            {formatDateTime(item.dateTime)}
                        </Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={16} color={AppColors.textSecondary} />
                        <Text style={styles.detailText}>
                            {item.location}
                        </Text>
                    </View>

                    {item.groupName && (
                        <View style={styles.detailRow}>
                            <Ionicons name="people-outline" size={16} color={AppColors.textSecondary} />
                            <Text style={styles.detailText}>
                                {item.groupName}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.eventFooter}>
                    <View style={styles.attendeeInfo}>
                        <Ionicons name="people" size={16} color={AppColors.textSecondary} />
                        <Text style={styles.attendeeText}>
                            {item.attendeeCount}{item.maxAttendees ? `/${item.maxAttendees}` : ''} attending
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.rsvpButton, item.isAttending && styles.attendingButton]}
                        onPress={() => handleRSVP(item)}
                        accessibilityRole="button"
                        accessibilityLabel={item.isAttending ? `Cancel RSVP for ${item.title}` : `RSVP for ${item.title}`}
                        accessibilityHint={item.isAttending ? "Cancel your attendance" : "Confirm your attendance"}
                    >
                        <Text style={[styles.rsvpButtonText, item.isAttending && styles.attendingButtonText]}>
                            {item.isAttending ? 'Attending' : 'RSVP'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={AppColors.textSecondary} />
            <Text style={styles.emptyTitle} accessibilityRole="header">
                {filter === 'attending' ? 'No events yet' : 'No events found'}
            </Text>
            <Text style={styles.emptyDescription} accessibilityRole="text">
                {filter === 'attending'
                    ? 'You haven\'t RSVP\'d to any events yet. Browse upcoming events to find something interesting!'
                    : 'Check back later for new events in your community.'
                }
            </Text>
            {filter === 'attending' && (
                <AccessibleButton
                    title="Browse Events"
                    onPress={() => handleFilterChange('all')}
                    variant="primary"
                    style={styles.browseButton}
                    textStyle={styles.browseButtonText}
                    accessibilityHint="Switch to all events to find events to attend"
                />
            )}
        </View>
    );

    const filteredEvents = getFilteredEvents();

    return (
        <SafeAreaView style={styles.container}>
            <OfflineBanner />
            <View style={styles.header}>
                <Text style={styles.title} accessibilityRole="header">
                    Events
                </Text>
                <AccessibleButton
                    title="Create"
                    onPress={handleCreateEvent}
                    variant="primary"
                    size="small"
                    accessibilityHint="Create a new event"
                    style={styles.createButton}
                    textStyle={styles.createButtonText}
                />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={AppColors.primary} />
                    <Text style={styles.loadingText}>Loading events...</Text>
                </View>
            ) : (
                <>
                    <View style={styles.filterContainer}>
                        <TouchableOpacity
                            style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
                            onPress={() => handleFilterChange('all')}
                            accessibilityRole="tab"
                            accessibilityLabel={`All events. ${events.length} events`}
                            accessibilityState={{ selected: filter === 'all' }}
                        >
                            <Text style={[styles.filterTabText, filter === 'all' && styles.activeFilterTabText]}>
                                All ({events.length})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.filterTab, filter === 'attending' && styles.activeFilterTab]}
                            onPress={() => handleFilterChange('attending')}
                            accessibilityRole="tab"
                            accessibilityLabel={`My events. ${events.filter(e => e.isAttending).length} events`}
                            accessibilityState={{ selected: filter === 'attending' }}
                        >
                            <Text style={[styles.filterTabText, filter === 'attending' && styles.activeFilterTabText]}>
                                My Events ({events.filter(e => e.isAttending).length})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.filterTab, filter === 'upcoming' && styles.activeFilterTab]}
                            onPress={() => handleFilterChange('upcoming')}
                            accessibilityRole="tab"
                            accessibilityLabel={`Upcoming events. ${events.filter(e => new Date(e.dateTime) > new Date()).length} events`}
                            accessibilityState={{ selected: filter === 'upcoming' }}
                        >
                            <Text style={[styles.filterTabText, filter === 'upcoming' && styles.activeFilterTabText]}>
                                Upcoming ({events.filter(e => new Date(e.dateTime) > new Date()).length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={filteredEvents}
                        keyExtractor={(item) => item.id}
                        renderItem={renderEventItem}
                        ListEmptyComponent={renderEmptyState}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                accessibilityLabel="Pull to refresh events"
                            />
                        }
                        style={styles.eventsList}
                        showsVerticalScrollIndicator={false}
                        accessibilityLabel="Events list"
                        contentContainerStyle={filteredEvents.length === 0 ? { flex: 1 } : undefined}
                    />
                </>
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
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: AppColors.inputBg,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 8,
        padding: 4,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    activeFilterTab: {
        backgroundColor: AppColors.background,
        shadowColor: AppColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    filterTabText: {
        fontSize: 14,
        fontWeight: '500',
        color: AppColors.textSecondary,
    },
    activeFilterTabText: {
        color: AppColors.primary,
    },
    eventsList: {
        flex: 1,
    },
    eventItem: {
        marginHorizontal: 16,
        marginVertical: 4,
        backgroundColor: AppColors.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.border,
        shadowColor: AppColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    eventContent: {
        padding: 16,
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    eventTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: AppColors.text,
        flex: 1,
        marginRight: 8,
    },
    creatorBadge: {
        backgroundColor: AppColors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    creatorBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: AppColors.background,
    },
    eventDescription: {
        fontSize: 14,
        color: AppColors.textSecondary,
        lineHeight: 20,
        marginBottom: 12,
    },
    eventDetails: {
        gap: 6,
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        fontSize: 14,
        color: AppColors.text,
        marginLeft: 6,
        flex: 1,
    },
    eventFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    attendeeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    attendeeText: {
        fontSize: 14,
        color: AppColors.textSecondary,
        marginLeft: 6,
    },
    rsvpButton: {
        backgroundColor: AppColors.borderLight,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    attendingButton: {
        backgroundColor: AppColors.success,
    },
    rsvpButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: AppColors.primary,
    },
    attendingButtonText: {
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
    browseButton: {
        minWidth: 140,
    },
    browseButtonText: {
        fontSize: 16,
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
});
