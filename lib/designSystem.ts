// Design System - Modern & Minimal
export const colors = {
  // Primary gradient
  primary: '#667eea',
  primaryDark: '#764ba2',

  // Neutrals
  background: '#f8f9fa',
  surface: '#ffffff',
  border: '#e9ecef',

  // Text
  text: '#212529',
  textSecondary: '#6c757d',
  textLight: '#adb5bd',

  // Status
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 42,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
};

export const typography = {
  h1: {
    fontSize: fontSize.xxxl,
    fontWeight: '700' as const,
    letterSpacing: -1.5,
    color: colors.text,
  },
  h2: {
    fontSize: fontSize.xxl,
    fontWeight: '700' as const,
    letterSpacing: -1,
    color: colors.text,
  },
  h3: {
    fontSize: fontSize.xl,
    fontWeight: '600' as const,
    letterSpacing: -0.5,
    color: colors.text,
  },
  body: {
    fontSize: fontSize.md,
    fontWeight: '400' as const,
    color: colors.text,
  },
  caption: {
    fontSize: fontSize.sm,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  small: {
    fontSize: fontSize.xs,
    fontWeight: '400' as const,
    color: colors.textLight,
  },
};
