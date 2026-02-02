/**
 * App color palette: green, white, black.
 * Use these across the entire UI for consistency.
 */

import { Platform } from 'react-native';

// Primary palette
export const AppColors = {
  primary: '#22c55e',      // Green (buttons, accents, links, selected)
  primaryDark: '#16a34a',  // Darker green (pressed, headers)
  background: '#ffffff',   // White (screens, cards)
  text: '#000000',        // Black (primary text)
  textSecondary: '#374151', // Gray-700 (secondary text, hints)
  border: '#e5e7eb',      // Light gray (borders, dividers)
  borderLight: '#f3f4f6', // Lighter gray
  error: '#dc2626',       // Red (errors, destructive)
  errorBgLight: '#fef2f2', // Light red background (error banners)
  warning: '#f59e0b',    // Amber (pending, warnings)
  success: '#22c55e',     // Same as primary
  white: '#ffffff',
  black: '#000000',
  // For dark sections (e.g. chat headers) use primaryDark with white text
  headerBg: '#16a34a',
  headerText: '#ffffff',
  // Inputs
  inputBg: '#f9fafb',
  inputBorder: '#e5e7eb',
  placeholder: '#6b7280',
  // Light green gradient for auth screens (green/white theme)
  gradientAuth: ['#f0fdf4', '#dcfce7', '#bbf7d0'] as readonly [string, string, string],
};

// Legacy Colors for themed-text / themed-view if still used
const tintColorLight = AppColors.primary;
const tintColorDark = AppColors.white;

export const Colors = {
  light: {
    text: AppColors.text,
    background: AppColors.background,
    tint: tintColorLight,
    icon: AppColors.textSecondary,
    tabIconDefault: AppColors.textSecondary,
    tabIconSelected: AppColors.primary,
  },
  dark: {
    text: AppColors.white,
    background: '#0f172a',
    tint: tintColorDark,
    icon: '#94a3b8',
    tabIconDefault: '#94a3b8',
    tabIconSelected: AppColors.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
