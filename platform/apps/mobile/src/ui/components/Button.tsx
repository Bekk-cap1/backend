import { Pressable, Text, ActivityIndicator, StyleSheet, type PressableProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  ...props
}: PressableProps & { title: string; variant?: ButtonVariant; loading?: boolean }) {
  const { theme } = useTheme();

  const backgroundByVariant: Record<ButtonVariant, string> = {
    primary: theme.colors.primary,
    secondary: theme.colors.card,
    ghost: 'transparent',
    destructive: theme.colors.danger,
  };

  const textByVariant: Record<ButtonVariant, string> = {
    primary: '#FFFFFF',
    secondary: theme.colors.text,
    ghost: theme.colors.text,
    destructive: '#FFFFFF',
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: backgroundByVariant[variant],
          borderColor: variant === 'ghost' ? theme.colors.border : 'transparent',
          opacity: pressed || disabled ? 0.8 : 1,
        },
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textByVariant[variant]} />
      ) : (
        <Text style={[styles.text, { color: textByVariant[variant] }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
});
