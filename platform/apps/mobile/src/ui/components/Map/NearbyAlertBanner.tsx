import { Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export function NearbyAlertBanner({ message }: { message: string }) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        borderRadius: 12,
        backgroundColor: `${theme.colors.warning}25`,
        borderWidth: 1,
        borderColor: `${theme.colors.warning}88`,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{message}</Text>
    </View>
  );
}
