import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function Chip({ label, onPress }: { label: string; onPress?: () => void }) {
  const { theme } = useTheme();

  const content = (
    <View style={[styles.container, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
      <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{label}</Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
});
