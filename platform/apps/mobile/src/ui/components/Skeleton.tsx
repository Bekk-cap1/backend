import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function Skeleton({ height = 18 }: { height?: number }) {
  const { theme } = useTheme();
  return <View style={{ height, borderRadius: 10, backgroundColor: theme.colors.border, width: '100%' }} />;
}
