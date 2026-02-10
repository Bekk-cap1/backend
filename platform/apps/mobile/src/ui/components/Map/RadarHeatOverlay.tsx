import { Circle } from 'react-native-maps';
import type { MapMarker } from './types';

export function RadarHeatOverlay({
  radars,
  visible,
}: {
  radars: MapMarker[];
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <>
      {radars.map((radar) => (
        <Circle
          key={`heat:${radar.id}`}
          center={{ latitude: radar.lat, longitude: radar.lon }}
          radius={Math.min(Math.max(radar.radiusMeters ?? 350, 200), 1200)}
          fillColor="rgba(251,113,133,0.18)"
          strokeColor="rgba(251,113,133,0.42)"
          strokeWidth={1}
        />
      ))}
    </>
  );
}
