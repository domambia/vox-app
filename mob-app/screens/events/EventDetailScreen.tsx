import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { OfflineBanner } from '../../components/accessible/OfflineBanner';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { hapticService } from '../../services/accessibility/hapticService';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { getEvent, rsvpToEvent, getEventRSVPs, deleteEvent } from '../../store/slices/eventsSlice';
import type { EventsStackParamList } from '../../navigation/MainNavigator';

type EventDetailScreenRouteProp = RouteProp<EventsStackParamList, 'EventDetail'>;
type EventDetailScreenNavigationProp = NativeStackNavigationProp<EventsStackParamList, 'EventDetail'>;

/**
 * Event Detail Screen - Full event information with RSVP and attendee list
 * Voice-first design for accessible event viewing
 */
export const EventDetailScreen: React.FC = () => {
  const navigation = useNavigation<EventDetailScreenNavigationProp>();
  const route = useRoute<EventDetailScreenRouteProp>();
  const { eventId } = route.params;
  const dispatch = useAppDispatch();
  const eventsState = useAppSelector((state: any) => state.events);

  const [rsvpStatus, setRsvpStatus] = useState<'going' | 'maybe' | 'not_going' | null>(null);
  const [showAttendees, setShowAttendees] = useState(false);

  // Find event in state or fetch it
  const event = eventsState.events.find((e: any) => e.eventId === eventId) ||
    eventsState.userEvents.find((e: any) => e.eventId === eventId);

  useEffect(() => {
    // Fetch event if not in state
    if (!event) {
      dispatch(getEvent(eventId));
    }
    // Fetch RSVPs
    dispatch(getEventRSVPs({ eventId, page: 1, limit: 50 }));
  }, [eventId, dispatch]);

  useEffect(() => {
    if (event) {
      const announceScreen = async () => {
        setTimeout(async () => {
          await announceToScreenReader(
            `Event detail: ${event.title}. ${formatDateTime(event.startTime || (event as any).date_time)}. At ${event.location || 'Location TBD'}. ${event.attendeeCount} attending.`
          );
        }, 500);
      };
      announceScreen();
    }
  }, [event]);

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

  const handleRSVP = async (status: 'going' | 'maybe' | 'not_going') => {
    hapticService.light();
    setRsvpStatus(status);

    try {
      const result = await dispatch(rsvpToEvent({ eventId, data: { status } }));
      if (rsvpToEvent.fulfilled.match(result)) {
        await announceToScreenReader(`RSVP status set to ${status === 'going' ? 'going' : status === 'maybe' ? 'maybe' : 'not going'}`);
        hapticService.success();
        // Refresh event to get updated attendee count
        dispatch(getEvent(eventId));
      } else {
        throw new Error(result.payload as string || 'Failed to update RSVP');
      }
    } catch (error: any) {
      await announceToScreenReader(`Error: ${error.message}`, { isAlert: true });
      hapticService.error();
      setRsvpStatus(null);
    }
  };

  const handleDeleteEvent = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => announceToScreenReader('Delete cancelled'),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            hapticService.light();
            const result = await dispatch(deleteEvent(eventId));
            if (deleteEvent.fulfilled.match(result)) {
              await announceToScreenReader('Event deleted');
              hapticService.success();
              navigation.goBack();
            } else {
              await announceToScreenReader(`Error: ${result.payload}`, { isAlert: true });
              hapticService.error();
            }
          },
        },
      ],
      { accessible: true }
    );
  };

  const toggleAttendees = () => {
    hapticService.light();
    setShowAttendees(!showAttendees);
    announceToScreenReader(showAttendees ? 'Attendee list hidden' : 'Attendee list shown');
  };

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText} accessibilityRole="text">Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const rsvps = eventsState.eventRSVPs[eventId] || [];
  const goingRSVPs = rsvps.filter((r: any) => r.status === 'going');
  const isCreator = false; // TODO: Get from auth state

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            hapticService.light();
            navigation.goBack();
          }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Return to events list"
        >
          <Ionicons name="arrow-back" size={24} color={AppColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">Event Details</Text>
        {isCreator && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteEvent}
            accessibilityRole="button"
            accessibilityLabel="Delete event"
            accessibilityHint="Delete this event permanently"
          >
            <Ionicons name="trash-outline" size={24} color={AppColors.error} />
          </TouchableOpacity>
        )}
        {!isCreator && <View style={styles.headerRight} />}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.title} accessibilityRole="header">{event.title}</Text>

        {/* Date & Time */}
        <View style={styles.detailSection}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={AppColors.primary} />
            <Text style={styles.detailText} accessibilityRole="text">
              {formatDateTime(event.startTime || (event as any).date_time)}
            </Text>
          </View>
          {event.endTime && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color={AppColors.primary} />
              <Text style={styles.detailText} accessibilityRole="text">
                Ends: {formatDateTime(event.endTime)}
              </Text>
            </View>
          )}
        </View>

        {/* Location */}
        {event.location && (
          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color={AppColors.primary} />
              <Text style={styles.detailText} accessibilityRole="text">{event.location}</Text>
            </View>
          </View>
        )}

        {/* Description */}
        {event.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Description</Text>
            <Text style={styles.description} accessibilityRole="text">{event.description}</Text>
          </View>
        )}

        {/* Attendee Info */}
        <View style={styles.section}>
          <View style={styles.attendeeHeader}>
            <View>
              <Text style={styles.sectionTitle} accessibilityRole="header">Attendees</Text>
              <Text style={styles.attendeeCount} accessibilityRole="text">
                {event.attendeeCount}{event.maxAttendees ? ` / ${event.maxAttendees}` : ''} attending
              </Text>
            </View>
            {rsvps.length > 0 && (
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={toggleAttendees}
                accessibilityRole="button"
                accessibilityLabel={showAttendees ? 'Hide attendees' : 'Show attendees'}
              >
                <Ionicons
                  name={showAttendees ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={AppColors.primary}
                />
              </TouchableOpacity>
            )}
          </View>

          {showAttendees && rsvps.length > 0 && (
            <View style={styles.attendeesList}>
              {goingRSVPs.map((rsvp: any) => (
                <View key={rsvp.rsvpId} style={styles.attendeeItem}>
                  <Text style={styles.attendeeName} accessibilityRole="text">
                    {rsvp.user?.firstName} {rsvp.user?.lastName}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* RSVP Buttons */}
        <View style={styles.rsvpSection}>
          <Text style={styles.sectionTitle} accessibilityRole="header">RSVP</Text>
          <View style={styles.rsvpButtons}>
            <AccessibleButton
              title="Going"
              onPress={() => handleRSVP('going')}
              variant={rsvpStatus === 'going' ? 'primary' : 'outline'}
              accessibilityHint="Confirm you are attending this event"
              style={styles.rsvpButton}
            />
            <AccessibleButton
              title="Maybe"
              onPress={() => handleRSVP('maybe')}
              variant={rsvpStatus === 'maybe' ? 'primary' : 'outline'}
              accessibilityHint="Mark as maybe attending"
              style={styles.rsvpButton}
            />
            <AccessibleButton
              title="Can't Go"
              onPress={() => handleRSVP('not_going')}
              variant={rsvpStatus === 'not_going' ? 'primary' : 'outline'}
              accessibilityHint="Mark as not attending"
              style={styles.rsvpButton}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: AppColors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.text,
  },
  deleteButton: {
    padding: 8,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 16,
  },
  detailSection: {
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    fontSize: 16,
    color: AppColors.text,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: AppColors.text,
    lineHeight: 24,
  },
  attendeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendeeCount: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 4,
  },
  toggleButton: {
    padding: 8,
  },
  attendeesList: {
    marginTop: 12,
    gap: 8,
  },
  attendeeItem: {
    padding: 12,
    backgroundColor: AppColors.inputBg,
    borderRadius: 8,
  },
  attendeeName: {
    fontSize: 16,
    color: AppColors.text,
  },
  rsvpSection: {
    marginTop: 8,
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  rsvpButton: {
    flex: 1,
  },
});
