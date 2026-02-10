import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import MapNativeView, { Marker, Polyline } from 'react-native-maps';
import { useTheme } from '../../theme/ThemeProvider';
import type { MapCoordinate, MapMarker } from './types';
import { toLatLng } from '../../../core/location/polyline';
import { RadarHeatOverlay } from './RadarHeatOverlay';

function clusterMarkers(markers: MapMarker[], precision = 2): MapMarker[] {
  if (markers.length < 30) return markers;

  const factor = Math.pow(10, precision);
  const groups = new Map<string, MapMarker[]>();

  for (const marker of markers) {
    const key = `${Math.round(marker.lat * factor)}:${Math.round(marker.lon * factor)}:${marker.kind}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(marker);
    } else {
      groups.set(key, [marker]);
    }
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    const first = group[0];
    if (group.length === 1) return first;

    const avgLat = group.reduce((sum, item) => sum + item.lat, 0) / group.length;
    const avgLon = group.reduce((sum, item) => sum + item.lon, 0) / group.length;

    return {
      ...first,
      id: `cluster:${key}`,
      lat: avgLat,
      lon: avgLon,
      count: group.length,
      title: `${group.length} ${first.kind}`,
      description: 'Clustered markers',
    };
  });
}

export function MapView({
  center,
  routeCoords,
  driver,
  poiMarkers = [],
  radarMarkers = [],
  showPoi = true,
  showRadars = true,
  showRadarHeat = false,
  children,
}: {
  center?: MapCoordinate | null;
  routeCoords?: MapCoordinate[];
  driver?: MapCoordinate | null;
  poiMarkers?: MapMarker[];
  radarMarkers?: MapMarker[];
  showPoi?: boolean;
  showRadars?: boolean;
  showRadarHeat?: boolean;
  children?: ReactNode;
}) {
  const { theme } = useTheme();
  const mapRef = useRef<MapNativeView | null>(null);

  const latLngRoute = useMemo(() => toLatLng(routeCoords ?? []), [routeCoords]);
  const mapMarkers = useMemo(() => {
    const points: MapMarker[] = [];
    if (showPoi) points.push(...poiMarkers);
    if (showRadars) points.push(...radarMarkers);
    return clusterMarkers(points);
  }, [poiMarkers, radarMarkers, showPoi, showRadars]);

  const initialRegion = useMemo(() => {
    const fallback = center ?? routeCoords?.[0] ?? driver ?? { lat: 41.3111, lon: 69.2797 };
    return {
      latitude: fallback.lat,
      longitude: fallback.lon,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [center, driver, routeCoords]);

  useEffect(() => {
    if (!mapRef.current) return;

    const fitPoints = [
      ...latLngRoute,
      ...(driver ? [{ latitude: driver.lat, longitude: driver.lon }] : []),
      ...mapMarkers.map((marker) => ({ latitude: marker.lat, longitude: marker.lon })),
    ];

    if (fitPoints.length >= 2) {
      mapRef.current.fitToCoordinates(fitPoints, {
        edgePadding: { top: 80, right: 40, bottom: 120, left: 40 },
        animated: true,
      });
    }
  }, [driver, latLngRoute, mapMarkers]);

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
      }}
    >
      <MapNativeView
        ref={(instance) => {
          mapRef.current = instance;
        }}
        style={{ flex: 1, minHeight: 280 }}
        initialRegion={initialRegion}
      >
        {latLngRoute.length >= 2 ? (
          <Polyline coordinates={latLngRoute} strokeWidth={4} strokeColor={theme.colors.primary} />
        ) : null}

        {driver ? (
          <Marker
            coordinate={{ latitude: driver.lat, longitude: driver.lon }}
            pinColor={theme.colors.accent}
            title="Driver"
            description="Live location"
          />
        ) : null}

        <RadarHeatOverlay radars={radarMarkers} visible={showRadarHeat && showRadars} />

        {mapMarkers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{ latitude: marker.lat, longitude: marker.lon }}
            pinColor={marker.kind === 'radar' ? theme.colors.warning : theme.colors.success}
            title={marker.title ?? marker.kind}
            description={marker.count ? `Cluster of ${marker.count}` : marker.description}
          />
        ))}
      </MapNativeView>

      {mapsLink ? (
        <Pressable
          onPress={() => {
            Linking.openURL(mapsLink).catch(() => undefined);
          }}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            backgroundColor: theme.colors.cardGlass,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '600' }}>Open in Maps</Text>
        </Pressable>
      ) : null}

      {children ? <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>{children}</View> : null}
    </View>
  );
}
