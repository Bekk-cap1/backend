import type { ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { theme } = useTheme();

  return <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, style]}>{children}</View>;
}

export function GlassCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { theme } = useTheme();

  return <View style={[styles.card, { backgroundColor: theme.colors.cardGlass, borderColor: theme.colors.border }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 10,
  },
});
