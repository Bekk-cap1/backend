import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export function DockPanel({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        borderRadius: 24,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.cardGlass,
        padding: 14,
        gap: 10,
      }}
    >
      {children}
    </View>
  );
}
