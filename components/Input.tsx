import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '../lib/designSystem';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  success?: boolean;
  required?: boolean;
  disabled?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  rightIcon,
  error,
  success,
  required,
  disabled,
  secureTextEntry,
  keyboardType = 'default',
  multiline,
  numberOfLines,
  maxLength,
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const getContainerStyle = () => {
    const baseStyle = [styles.inputContainer];

    if (isFocused) {
      baseStyle.push(styles.inputFocused);
    }

    if (error) {
      baseStyle.push(styles.inputError);
    }

    if (success) {
      baseStyle.push(styles.inputSuccess);
    }

    if (disabled) {
      baseStyle.push(styles.inputDisabled);
    }

    return baseStyle;
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <View style={getContainerStyle()}>
        {icon && <View style={styles.icon}>{icon}</View>}

        <TextInput
          style={[styles.input, multiline && styles.multilineInput]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.passwordToggle}
          >
            {showPassword ? (
              <EyeOff size={20} color={colors.textSecondary} />
            ) : (
              <Eye size={20} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        )}

        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
      {success && !error && <Text style={styles.successText}>Valide</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: `${colors.error}08`,
  },
  inputSuccess: {
    borderColor: colors.success,
  },
  inputDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordToggle: {
    padding: spacing.xs,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    marginTop: spacing.xs,
  },
  successText: {
    fontSize: 13,
    color: colors.success,
    marginTop: spacing.xs,
  },
});
