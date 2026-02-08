import { Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { formatMoney } from '../../../core/format';

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
      <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Route</Text>
      <Text style={{ color: theme.colors.muted }}>
        {(distanceMeters ?? 0) > 0 ? `${((distanceMeters ?? 0) / 1000).toFixed(1)} km` : 'Distance n/a'}
      </Text>
      <Text style={{ color: theme.colors.muted }}>
        {duration ? `ETA ${Math.max(1, Math.round(duration / 60))} min` : 'ETA unavailable'}
      </Text>
      {typeof price === 'number' ? (
        <Text style={{ color: theme.colors.muted }}>Price {formatMoney(price, 'UZS')}</Text>
      ) : null}
    </View>
  );
}
