import React from 'react';
import { Image, ImageProps, View, Text, StyleSheet } from 'react-native';
import { useAppSelector } from '../../hooks/useAppSelector';

interface AccessibleImageProps extends ImageProps {
  description?: string;
  fallbackText?: string;
  showDescription?: boolean;
}

/**
 * Accessible Image component that provides descriptions for visually impaired users
 * Automatically uses settings to determine if descriptions should be shown
 */
export const AccessibleImage: React.FC<AccessibleImageProps> = ({
  description,
  fallbackText,
  showDescription,
  accessibilityLabel,
  ...imageProps
}) => {
  const settings = useAppSelector((state: any) => state.settings);
  const enableDescriptions = showDescription ?? settings?.accessibility?.enableImageDescriptions ?? true;

  // Generate accessibility label
  const finalAccessibilityLabel = accessibilityLabel || description || fallbackText || 'Image';

  // If image descriptions are disabled and no explicit description provided, use minimal label
  const imageLabel = enableDescriptions && description
    ? description
    : (accessibilityLabel || fallbackText || 'Image');

  return (
    <View style={styles.container}>
      <Image
        {...imageProps}
        accessibilityRole="image"
        accessibilityLabel={imageLabel}
        accessibilityHint={description ? undefined : 'Image without description'}
      />
      {enableDescriptions && description && (
        <View style={styles.descriptionContainer} accessibilityRole="text">
          <Text style={styles.descriptionText}>{description}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  descriptionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  descriptionText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
});
