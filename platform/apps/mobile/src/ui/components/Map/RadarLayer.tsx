import { Text, View } from 'react-native';
import { Chip } from '../Chip';

export function RadarLayer({ radars }: { radars: Array<{ id?: string; type?: string }> }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: '700' }}>Radars</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {radars.slice(0, 10).map((radar, idx) => (
          <Chip key={radar.id ?? `radar-${idx}`} label={radar.type ?? 'radar'} />
        ))}
      </View>
    </View>
  );
}
