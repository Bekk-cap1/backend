import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

const statusColors: Record<string, string> = {
  pending: '#FFB020',
  accepted: '#20C997',
  confirmed: '#20C997',
  completed: '#20C997',
  verified: '#20C997',
  rejected: '#FF4D4F',
  canceled: '#FF4D4F',
  unpaid: '#FFB020',
  paid: '#20C997',
  open: '#4F7CFF',
  in_progress: '#FFB020',
  resolved: '#20C997',
  default: '#93A4C7',
};

export function Badge({ label }: { label: string }) {
  const { theme } = useTheme();
  const key = label.toLowerCase();
  const color = statusColors[key] ?? statusColors.default;

  return (
    <View style={[styles.badge, { backgroundColor: `${color}33`, borderColor: `${color}66` }]}>
      <Text style={{ color: theme.colors.text, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
});
