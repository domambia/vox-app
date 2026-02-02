import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { AccessibleButton } from './AccessibleButton';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

export interface EmptyStateAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  accessibilityLabel?: string;
}

/**
 * Enhanced Empty State Component
 * Provides actionable guidance when lists are empty
 * Voice-first design for accessible empty states
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'document-outline',
  title,
  description,
  actions = [],
  accessibilityLabel,
}) => {
  const finalAccessibilityLabel = accessibilityLabel || `${title}. ${description}`;

  return (
    <View
      style={styles.container}
      accessibilityRole="region"
      accessibilityLabel={finalAccessibilityLabel}
    >
      <Ionicons name={icon} size={64} color={AppColors.border} />
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      <Text style={styles.description} accessibilityRole="text">{description}</Text>
      
      {actions.length > 0 && (
        <View style={styles.actionsContainer}>
          {actions.map((action, index) => (
            <AccessibleButton
              key={index}
              title={action.label}
              onPress={() => {
                announceToScreenReader(`Navigating to ${action.label}`);
                action.onPress();
              }}
              variant={action.variant || 'primary'}
              style={styles.actionButton}
              accessibilityHint={`${action.label} action`}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.text,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  actionButton: {
    minWidth: 200,
  },
});
