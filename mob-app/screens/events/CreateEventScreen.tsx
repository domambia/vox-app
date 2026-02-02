import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
// Using text input for date/time since DateTimePicker not installed
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { AccessibleInput } from '../../components/accessible/AccessibleInput';
import { OfflineBanner } from '../../components/accessible/OfflineBanner';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { hapticService } from '../../services/accessibility/hapticService';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { createEvent } from '../../store/slices/eventsSlice';
import type { EventsStackParamList } from '../../navigation/MainNavigator';

type CreateEventScreenNavigationProp = NativeStackNavigationProp<EventsStackParamList, 'CreateEvent'>;

interface EventFormData {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date | null;
  location: string;
  maxAttendees: string;
  accessibilityNotes: string;
}

/**
 * Create Event Screen - Accessible event creation form
 * Voice-first design for creating community events
 */
export const CreateEventScreen: React.FC = () => {
  const navigation = useNavigation<CreateEventScreenNavigationProp>();
  const dispatch = useAppDispatch();
  
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const defaultDate = tomorrow.toISOString().split('T')[0];
  const defaultTime = '18:00';

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    startTime: tomorrow,
    endTime: null,
    location: '',
    maxAttendees: '',
    accessibilityNotes: '',
  });

  useEffect(() => {
    setStartDateText(defaultDate);
    setStartTimeText(defaultTime);
  }, []);

  const [startDateText, setStartDateText] = useState('');
  const [startTimeText, setStartTimeText] = useState('');
  const [endDateText, setEndDateText] = useState('');
  const [endTimeText, setEndTimeText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof EventFormData, string>>>({});

  useEffect(() => {
    const announceScreen = async () => {
      setTimeout(async () => {
        await announceToScreenReader(
          'Create event screen. Fill in the form to create a new community event.'
        );
      }, 500);
    };
    announceScreen();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof EventFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (formData.endTime && formData.endTime <= formData.startTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    if (formData.maxAttendees && isNaN(Number(formData.maxAttendees))) {
      newErrors.maxAttendees = 'Maximum attendees must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    hapticService.light();
    
    if (!validateForm()) {
      await announceToScreenReader('Please fix the errors in the form', { isAlert: true });
      return;
    }

    setIsSubmitting(true);
    hapticService.success();

    try {
      // Parse date and time strings
      const startDateTime = new Date(`${startDateText}T${startTimeText}`);
      let endDateTime: Date | undefined;
      if (endDateText && endTimeText) {
        endDateTime = new Date(`${endDateText}T${endTimeText}`);
      }

      if (isNaN(startDateTime.getTime())) {
        setErrors(prev => ({ ...prev, startTime: 'Invalid date or time' }));
        return;
      }

      if (endDateTime && isNaN(endDateTime.getTime())) {
        setErrors(prev => ({ ...prev, endTime: 'Invalid date or time' }));
        return;
      }

      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime?.toISOString(),
        location: formData.location.trim() || 'TBD',
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees, 10) : undefined,
        accessibilityNotes: formData.accessibilityNotes.trim() || undefined,
      };

      const result = await dispatch(createEvent(eventData));
      
      if (createEvent.fulfilled.match(result)) {
        await announceToScreenReader(`Event "${formData.title}" created successfully`);
        navigation.goBack();
      } else {
        throw new Error(result.payload as string || 'Failed to create event');
      }
    } catch (error: any) {
      await announceToScreenReader(`Error: ${error.message}`, { isAlert: true });
      hapticService.error();
    } finally {
      setIsSubmitting(false);
    }
  };


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
          accessibilityHint="Cancel event creation and return to events list"
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">Create Event</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.formSection}>
          <Text style={styles.label} accessibilityRole="text">
            Event Title *
          </Text>
          <AccessibleInput
            value={formData.title}
            onChangeText={(text) => {
              setFormData(prev => ({ ...prev, title: text }));
              if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
            }}
            placeholder="Enter event title"
            accessibilityLabel="Event title"
            accessibilityHint="Required. Enter a descriptive title for your event"
            error={errors.title}
          />
        </View>

        {/* Description */}
        <View style={styles.formSection}>
          <Text style={styles.label} accessibilityRole="text">
            Description
          </Text>
          <AccessibleInput
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="Describe your event"
            multiline
            numberOfLines={4}
            accessibilityLabel="Event description"
            accessibilityHint="Optional. Provide details about your event"
          />
        </View>

        {/* Start Date */}
        <View style={styles.formSection}>
          <Text style={styles.label} accessibilityRole="text">
            Start Date *
          </Text>
          <AccessibleInput
            value={startDateText}
            onChangeText={(text) => {
              setStartDateText(text);
              if (errors.startTime) setErrors(prev => ({ ...prev, startTime: undefined }));
            }}
            placeholder="YYYY-MM-DD"
            accessibilityLabel="Start date"
            accessibilityHint="Required. Enter date in YYYY-MM-DD format"
            error={errors.startTime}
          />
        </View>

        {/* Start Time */}
        <View style={styles.formSection}>
          <Text style={styles.label} accessibilityRole="text">
            Start Time *
          </Text>
          <AccessibleInput
            value={startTimeText}
            onChangeText={(text) => {
              setStartTimeText(text);
              if (errors.startTime) setErrors(prev => ({ ...prev, startTime: undefined }));
            }}
            placeholder="HH:MM (24-hour format)"
            accessibilityLabel="Start time"
            accessibilityHint="Required. Enter time in HH:MM format (24-hour)"
            error={errors.startTime}
          />
        </View>

        {/* End Date */}
        <View style={styles.formSection}>
          <Text style={styles.label} accessibilityRole="text">
            End Date
          </Text>
          <AccessibleInput
            value={endDateText}
            onChangeText={(text) => {
              setEndDateText(text);
              if (errors.endTime) setErrors(prev => ({ ...prev, endTime: undefined }));
            }}
            placeholder="YYYY-MM-DD (optional)"
            accessibilityLabel="End date"
            accessibilityHint="Optional. Enter date in YYYY-MM-DD format"
            error={errors.endTime}
          />
        </View>

        {/* End Time */}
        <View style={styles.formSection}>
          <Text style={styles.label} accessibilityRole="text">
            End Time
          </Text>
          <AccessibleInput
            value={endTimeText}
            onChangeText={(text) => {
              setEndTimeText(text);
              if (errors.endTime) setErrors(prev => ({ ...prev, endTime: undefined }));
            }}
            placeholder="HH:MM (24-hour format, optional)"
            accessibilityLabel="End time"
            accessibilityHint="Optional. Enter time in HH:MM format (24-hour)"
            error={errors.endTime}
          />
        </View>

        {/* Location */}
        <View style={styles.formSection}>
          <Text style={styles.label} accessibilityRole="text">
            Location
          </Text>
          <AccessibleInput
            value={formData.location}
            onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
            placeholder="Event location"
            accessibilityLabel="Event location"
            accessibilityHint="Optional. Enter the event location"
          />
        </View>

        {/* Max Attendees */}
        <View style={styles.formSection}>
          <Text style={styles.label} accessibilityRole="text">
            Maximum Attendees
          </Text>
          <AccessibleInput
            value={formData.maxAttendees}
            onChangeText={(text) => {
              setFormData(prev => ({ ...prev, maxAttendees: text }));
              if (errors.maxAttendees) setErrors(prev => ({ ...prev, maxAttendees: undefined }));
            }}
            placeholder="Leave empty for unlimited"
            keyboardType="numeric"
            accessibilityLabel="Maximum attendees"
            accessibilityHint="Optional. Enter the maximum number of attendees"
            error={errors.maxAttendees}
          />
        </View>

        {/* Accessibility Notes */}
        <View style={styles.formSection}>
          <Text style={styles.label} accessibilityRole="text">
            Accessibility Notes
          </Text>
          <AccessibleInput
            value={formData.accessibilityNotes}
            onChangeText={(text) => setFormData(prev => ({ ...prev, accessibilityNotes: text }))}
            placeholder="Describe accessibility features (wheelchair access, audio guides, etc.)"
            multiline
            numberOfLines={3}
            accessibilityLabel="Accessibility notes"
            accessibilityHint="Optional. Describe accessibility features of the venue"
          />
        </View>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <AccessibleButton
            title={isSubmitting ? "Creating..." : "Create Event"}
            onPress={handleSubmit}
            variant="primary"
            disabled={isSubmitting}
            loading={isSubmitting}
            accessibilityHint="Create the event with the provided information"
          />
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
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: AppColors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: AppColors.text,
    marginLeft: 12,
  },
  errorText: {
    fontSize: 14,
    color: AppColors.error,
    marginTop: 4,
  },
  submitContainer: {
    marginTop: 8,
  },
});
