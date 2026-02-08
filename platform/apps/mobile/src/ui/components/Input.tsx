import { TextInput, View, Text, StyleSheet, type TextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function Input({
  label,
  error,
  style,
  ...props
}: TextInputProps & { label?: string; error?: string | null }) {
  const { theme } = useTheme();

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.colors.muted}
        style={[
          styles.input,
          {
            color: theme.colors.text,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            backgroundColor: theme.colors.card,
          },
          style,
        ]}
        {...props}
      />
      {error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  error: {
    fontSize: 12,
  },
});
