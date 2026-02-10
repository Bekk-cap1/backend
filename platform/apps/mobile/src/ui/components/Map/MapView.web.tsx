import type { ReactNode } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { MapCoordinate, MapMarker } from './types';

export function MapView({
  center,
  routeCoords,
  driver,
  poiMarkers = [],
  radarMarkers = [],
  showPoi = true,
  showRadars = true,
  children,
}: {
  center?: MapCoordinate | null;
  routeCoords?: MapCoordinate[];
  driver?: MapCoordinate | null;
  poiMarkers?: MapMarker[];
  radarMarkers?: MapMarker[];
  showPoi?: boolean;
  showRadars?: boolean;
  children?: ReactNode;
}) {
  const { theme } = useTheme();

  const visiblePoi = showPoi ? poiMarkers.length : 0;
  const visibleRadars = showRadars ? radarMarkers.length : 0;
  const routePoints = routeCoords?.length ?? 0;
  const mapsLinkCenter = driver ?? center ?? routeCoords?.[0] ?? null;
  const mapsLink = mapsLinkCenter
    ? `https://www.google.com/maps/search/?api=1&query=${mapsLinkCenter.lat},${mapsLinkCenter.lon}`
    : null;

  return (
    <View
      style={{
        minHeight: 280,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.card,
        padding: 14,
        justifyContent: 'space-between',
      }}
    >
      <View>
        <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700' }}>
          Map preview
        </Text>
        <Text style={{ color: theme.colors.muted, marginTop: 6 }}>
          Native map is enabled on iOS/Android builds. Web fallback keeps route/ETA/POI context.
        </Text>
        <View style={{ marginTop: 10, gap: 4 }}>
          <Text style={{ color: theme.colors.text }}>Route points: {routePoints}</Text>
          <Text style={{ color: theme.colors.text }}>POI markers: {visiblePoi}</Text>
          <Text style={{ color: theme.colors.text }}>Radar markers: {visibleRadars}</Text>
          <Text style={{ color: theme.colors.text }}>
            Driver marker: {driver ? 'online' : 'unavailable'}
          </Text>
        </View>
      </View>

      {mapsLink ? (
        <Pressable
          onPress={() => {
            Linking.openURL(mapsLink).catch(() => undefined);
          }}
          style={{
            marginTop: 12,
            alignSelf: 'flex-start',
            backgroundColor: theme.colors.cardGlass,
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '600' }}>
            Open in Google Maps
          </Text>
        </Pressable>
      ) : null}

      {children ? <View style={{ marginTop: 12 }}>{children}</View> : null}
    </View>
  );
}
