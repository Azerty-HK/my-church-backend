import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { colors, spacing, borderRadius, shadows, typography } from '../lib/designSystem';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  onPress?: () => void;
}

export function StatCard({ title, value, icon, trend, trendUp, onPress }: StatCardProps) {
  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={[styles.card, shadows.md]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>{icon}</View>
      </View>

      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>

      {trend && (
        <View style={styles.trendContainer}>
          <Text style={[styles.trend, trendUp ? styles.trendUp : styles.trendDown]}>
            {trendUp ? '↗' : '↘'} {trend}
          </Text>
        </View>
      )}
    </Component>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flex: 1,
    minWidth: 150,
  },
  header: {
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  trendContainer: {
    marginTop: spacing.xs,
  },
  trend: {
    fontSize: 12,
    fontWeight: '600',
  },
  trendUp: {
    color: colors.success,
  },
  trendDown: {
    color: colors.error,
  },
});
