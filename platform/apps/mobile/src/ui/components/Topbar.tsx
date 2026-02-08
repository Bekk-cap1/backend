import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function Topbar({ title, right }: { title: string; right?: ReactNode }) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
      }}
    >
      <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '700' }}>{title}</Text>
      {right}
    </View>
  );
}
