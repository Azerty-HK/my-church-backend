export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  text: string;
  textSecondary: string;
  textOnPrimary: string;
  border: string;
  borderLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;
}

export const THEME_CONFIGS = {
  blue: {
    primary: '#3498db',
    primaryDark: '#2980b9',
    primaryLight: '#85c1e9',
    secondary: '#34495e',
    background: '#f8f9fa',
    surface: '#ffffff',
    surfaceVariant: '#f1f3f4',
    text: '#2c3e50',
    textSecondary: '#7f8c8d',
    textOnPrimary: '#ffffff',
    border: '#ecf0f1',
    borderLight: '#f8f9fa',
    success: '#27ae60',
    successLight: '#d5f4e6',
    warning: '#f39c12',
    warningLight: '#fef9e7',
    error: '#e74c3c',
    errorLight: '#fadbd8',
    info: '#3498db',
    infoLight: '#d6eaf8',
  },
  white: {
    primary: '#2c3e50',
    primaryDark: '#1a252f',
    primaryLight: '#566573',
    secondary: '#34495e',
    background: '#ffffff',
    surface: '#f8f9fa',
    surfaceVariant: '#e9ecef',
    text: '#2c3e50',
    textSecondary: '#7f8c8d',
    textOnPrimary: '#ffffff',
    border: '#dee2e6',
    borderLight: '#f8f9fa',
    success: '#28a745',
    successLight: '#d4edda',
    warning: '#ffc107',
    warningLight: '#fff3cd',
    error: '#dc3545',
    errorLight: '#f8d7da',
    info: '#17a2b8',
    infoLight: '#d1ecf1',
  },
  black: {
    primary: '#ffffff',
    primaryDark: '#f8f9fa',
    primaryLight: '#e9ecef',
    secondary: '#adb5bd',
    background: '#1a1a1a',
    surface: '#2d2d2d',
    surfaceVariant: '#404040',
    text: '#ffffff',
    textSecondary: '#adb5bd',
    textOnPrimary: '#1a1a1a',
    border: '#495057',
    borderLight: '#6c757d',
    success: '#20c997',
    successLight: '#1e7e34',
    warning: '#fd7e14',
    warningLight: '#e55100',
    error: '#e55353',
    errorLight: '#c62828',
    info: '#6f42c1',
    infoLight: '#4a148c',
  },
} as const;

export function getThemeColors(theme: string = 'blue'): ThemeColors {
  return THEME_CONFIGS[theme as keyof typeof THEME_CONFIGS] || THEME_CONFIGS.blue;
}

export function createThemedStyles(theme: string = 'blue') {
  const colors = getThemeColors(theme);
  
  return {
    colors,
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    surface: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 20,
      alignItems: 'center' as const,
    },
    buttonText: {
      color: colors.textOnPrimary,
      fontSize: 16,
      fontWeight: '600' as const,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surfaceVariant,
    },
    text: {
      color: colors.text,
    },
    textSecondary: {
      color: colors.textSecondary,
    },
    scrollView: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 20,
    },
  };
}