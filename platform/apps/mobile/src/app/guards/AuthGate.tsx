import type { ReactNode } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '../../ui/theme/ThemeProvider';
import { useAuth } from '../../stores/auth/auth.context';

export function AuthGate({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const { theme } = useTheme();

  if (state.status === 'bootstrapping') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg }}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
        <Text style={{ color: theme.colors.muted, marginTop: 12 }}>Bootstrapping session...</Text>
      </View>
    );
  }

  return <>{children}</>;
}
