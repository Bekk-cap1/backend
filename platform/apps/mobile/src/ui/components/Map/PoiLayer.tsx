import { Text, View } from 'react-native';
import { Chip } from '../Chip';

export function PoiLayer({ poi }: { poi: Array<{ id?: string; type?: string; name?: string }> }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: '700' }}>POI nearby</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {poi.slice(0, 10).map((item, idx) => (
          <Chip key={item.id ?? `${item.type ?? 'poi'}-${idx}`} label={item.name ?? item.type ?? 'POI'} />
        ))}
      </View>
    </View>
  );
}
