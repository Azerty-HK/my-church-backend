import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, spacing, typography } from '../lib/designSystem';

interface SectionProps {
  title: string;
  action?: string;
  onActionPress?: () => void;
  children: React.ReactNode;
}

export function Section({ title, action, onActionPress, children }: SectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {action && onActionPress && (
          <TouchableOpacity style={styles.action} onPress={onActionPress}>
            <Text style={styles.actionText}>{action}</Text>
            <ChevronRight size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
