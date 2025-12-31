import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { colors, spacing, borderRadius } from '../lib/designSystem';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
}: ButtonProps) {
  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[`${size}Button`]];

    if (fullWidth) {
      baseStyle.push(styles.fullWidth);
    }

    if (disabled || loading) {
      return [...baseStyle, styles.disabled];
    }

    return [...baseStyle, styles[`${variant}Button`]];
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text, styles[`${size}Text`]];

    if (variant === 'outline') {
      return [...baseStyle, styles.outlineText];
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : '#ffffff'} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={getTextStyle()}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },

  // Variants
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.textSecondary,
  },
  dangerButton: {
    backgroundColor: colors.error,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  disabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },

  // Sizes
  smallButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mediumButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  largeButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },

  // Text styles
  text: {
    fontWeight: '600',
    color: '#ffffff',
  },
  smallText: {
    fontSize: 13,
  },
  mediumText: {
    fontSize: 15,
  },
  largeText: {
    fontSize: 17,
  },
  outlineText: {
    color: colors.primary,
  },
});
