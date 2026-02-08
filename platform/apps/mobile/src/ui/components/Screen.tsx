import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { useConnectivityStatus } from '../../core/network/useConnectivityStatus';

export function Screen({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const online = useConnectivityStatus();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 16,
        gap: 12,
      }}
    >
      {!online ? (
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: theme.colors.warning, fontWeight: '600' }}>Offline mode: actions will be queued and retried.</Text>
        </View>
      ) : null}
      <View style={{ gap: 12 }}>{children}</View>
    </ScrollView>
  );
}
