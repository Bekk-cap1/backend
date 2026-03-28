import { Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { formatDistance, formatEtaSeconds, formatMoney } from '../../../core/format';

export function RoutePolyline({
  distanceMeters,
  durationSeconds,
  etaSeconds,
  price,
}: {
  distanceMeters?: number;
  durationSeconds?: number;
  etaSeconds?: number;
  price?: number;
}) {
  const { theme } = useTheme();
  const duration = durationSeconds ?? etaSeconds;

  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Маршрут</Text>
      <Text style={{ color: theme.colors.muted }}>{formatDistance(distanceMeters)}</Text>
      <Text style={{ color: theme.colors.muted }}>
        {duration ? `ETA ${formatEtaSeconds(duration)}` : 'ETA недоступно'}
      </Text>
      {typeof price === 'number' ? (
        <Text style={{ color: theme.colors.muted }}>Цена {formatMoney(price, 'UZS')}</Text>
      ) : null}
    </View>
  );
}
