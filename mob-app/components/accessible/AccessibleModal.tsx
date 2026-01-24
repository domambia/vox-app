import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ModalProps,
} from 'react-native';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

interface AccessibleModalProps extends ModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  closeButtonLabel?: string;
  style?: ViewStyle;
}

/**
 * Accessible modal component for VOX
 * Properly manages focus and screen reader announcements
 */
export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  visible,
  title,
  onClose,
  children,
  closeButtonLabel = 'Close',
  style,
  ...props
}) => {
  // Announce modal opening/closing
  useEffect(() => {
    if (visible) {
      // Delay announcement to ensure modal is rendered
      setTimeout(() => {
        announceToScreenReader(`${title} dialog opened`);
      }, 100);
    }
  }, [visible, title]);

  const handleClose = () => {
    announceToScreenReader(`${title} dialog closed`);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      accessibilityViewIsModal
      {...props}
    >
      <View style={styles.overlay}>
        <View
          style={[styles.modal, style]}
          accessibilityRole="none"
          accessibilityLabel={title}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text
              style={styles.title}
              accessibilityRole="header"
            >
              {title}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={closeButtonLabel}
              accessibilityHint="Double tap to close dialog"
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    maxWidth: 400,
    width: '100%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
});
