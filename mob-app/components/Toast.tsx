import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, Pressable } from 'react-native';
import { AppColors } from '../constants/theme';
import { useAppDispatch, useAppSelector } from '../hooks';
import { hideToast } from '../store/slices/toastSlice';

const TOAST_DURATION_MS = 4000;

export const Toast: React.FC = () => {
  const dispatch = useAppDispatch();
  const { message, type, visible } = useAppSelector((state) => state.toast);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible || !message) return;

    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    hideTimeoutRef.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => dispatch(hideToast()));
    }, TOAST_DURATION_MS);

    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [visible, message, dispatch, opacity]);

  const handleDismiss = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => dispatch(hideToast()));
  };

  if (!visible || !message) return null;

  const backgroundColor = type === 'error' ? AppColors.error : type === 'success' ? AppColors.primary : AppColors.primary;

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="box-none">
      <Pressable
        onPress={handleDismiss}
        style={[styles.toast, { backgroundColor }]}
        accessibilityRole="alert"
        accessibilityLabel={message}
        accessibilityLiveRegion="polite"
      >
        <Text style={styles.text} numberOfLines={3}>
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 9999,
    paddingTop: 48,
    alignItems: 'center',
  },
  toast: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    maxWidth: '100%',
    shadowColor: AppColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  text: {
    color: AppColors.white,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
