import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { MapView } from '../../ui/components/Map/MapView';
import { RoutePolyline } from '../../ui/components/Map/RoutePolyline';
import { RadarLayer } from '../../ui/components/Map/RadarLayer';
import { NearbyAlertBanner } from '../../ui/components/Map/NearbyAlertBanner';
import { api } from '../../api/client';
import { sendLocationWithQueue } from '../../api/critical-actions';
import { unwrapItems, unwrapPayload } from '../../api/mappers/dto';
import { ensureLocationPermissions } from '../../core/location/permissions';
import { startForegroundTracking, type LocationPoint } from '../../core/location/foreground';
import { startBackgroundTracking } from '../../core/location/background';
import { decodeRoutePolyline } from '../../core/location/polyline';
import { haversineMeters } from '../../core/location/geoMath';
import { appConfig } from '../../core/config';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import { shouldSendLocation, type LocationSendState } from '../../core/location/location-reliability';
import type { MapMarker } from '../../ui/components/Map/types';

function mapRadarMarkers(items: any[]): MapMarker[] {
  return items
    .filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)))
    .map((item, idx) => ({
      id: String(item.id ?? `radar-${idx}`),
      lat: Number(item.lat),
      lon: Number(item.lon),
      kind: String(item.type ?? '').includes('speed') || String(item.type ?? '').includes('hazard') ? 'radar' : 'poi',
      title: item.name ?? item.type ?? 'Radar',
      description: item.description ?? undefined,
    }));
}

export function ActiveTripScreen({ route }: { route: any }) {
  const tripId = String(route.params?.tripId ?? '');
  const { show } = useToast();

  const [routeData, setRouteData] = useState<any>(null);
  const [eta, setEta] = useState<any>(null);
  const [radarMarkers, setRadarMarkers] = useState<MapMarker[]>([]);
  const [sharing, setSharing] = useState(false);
  const [offlineRetry, setOfflineRetry] = useState(false);
  const [lastUpdateTs, setLastUpdateTs] = useState<number | null>(null);
  const [driverMarker, setDriverMarker] = useState<{ lat: number; lon: number } | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [showRadars, setShowRadars] = useState(true);
  const [showPoi, setShowPoi] = useState(true);

  const lastAlertRef = useRef<Record<string, number>>({});
  const lastSendRef = useRef<LocationSendState | null>(null);

  useEffect(() => {
    const load = async () => {
      const [routeRes, etaRes] = await Promise.all([
        api.routing.tripRoute(tripId),
        api.routing.tripEta(tripId),
      ]);

      const normalizedRoute = unwrapPayload<any>(routeRes);
      setRouteData(normalizedRoute);
      setEta(unwrapPayload<any>(etaRes));

      if (normalizedRoute?.polyline) {
        const poi = unwrapItems<any>(
          await api.poi.alongRoute({ polyline: normalizedRoute.polyline, bufferMeters: 1200 }),
        );
        setRadarMarkers(mapRadarMarkers(poi));
      }
    };

    load().catch((error) => {
      show({ title: toErrorMessage(error), tone: 'danger' });
    });
  }, [show, tripId]);

  useEffect(() => {
    const timer = setInterval(() => {
      api.routing
        .tripEta(tripId)
        .then((result) => setEta(unwrapPayload<any>(result)))
        .catch(() => undefined);
    }, 5000);

    return () => clearInterval(timer);
  }, [tripId]);

  useEffect(() => {
    let stopForeground: (() => void) | null = null;
    let stopBackground: (() => Promise<void>) | null = null;
    let mounted = true;

    const handlePoint = async (point: LocationPoint) => {
      if (!mounted) return;

      const shouldSend = shouldSendLocation(lastSendRef.current, point, {
        minIntervalMs: 2500,
        minDistanceMeters: 20,
      });

      if (!shouldSend) return;

      lastSendRef.current = {
        point,
        sentAt: point.capturedAt ?? Date.now(),
      };

      setDriverMarker({ lat: point.lat, lon: point.lon });

      try {
        const result = await sendLocationWithQueue({ tripId, point });
        setOfflineRetry(result.queued);
        setLastUpdateTs(Date.now());
      } catch (error) {
        setOfflineRetry(true);
        show({ title: toErrorMessage(error), tone: 'danger' });
      }

      for (const radar of radarMarkers) {
        const distance = haversineMeters(point.lat, point.lon, radar.lat, radar.lon);
        if (distance > appConfig.nearbyAlertRadiusMeters) continue;

        const key = radar.id;
        const now = Date.now();
        const prev = lastAlertRef.current[key] ?? 0;
        if (now - prev < 120000) continue;

        lastAlertRef.current[key] = now;
        setAlert(`${radar.title ?? 'Radar'} ahead ${Math.round(distance)}m`);
        break;
      }
    };

    const start = async () => {
      const permission = await ensureLocationPermissions();
      if (!permission.foreground) {
        show({ title: 'Location permission denied', tone: 'danger' });
        return;
      }

      stopForeground = await startForegroundTracking(handlePoint);
      if (permission.background) {
        stopBackground = await startBackgroundTracking(handlePoint);
      }

      setSharing(true);
    };

    start().catch((error) => {
      show({ title: toErrorMessage(error), tone: 'danger' });
    });

    return () => {
      mounted = false;
      stopForeground?.();
      stopBackground?.().catch(() => undefined);
      setSharing(false);
    };
  }, [radarMarkers, show, tripId]);

  const routeCoords = useMemo(() => decodeRoutePolyline(routeData?.polyline), [routeData?.polyline]);
  const radarOnly = useMemo(() => radarMarkers.filter((item) => item.kind === 'radar'), [radarMarkers]);
  const poiOnly = useMemo(() => radarMarkers.filter((item) => item.kind === 'poi'), [radarMarkers]);

  const lastUpdatedText = useMemo(() => {
    if (!lastUpdateTs) return 'never';
    const sec = Math.max(1, Math.round((Date.now() - lastUpdateTs) / 1000));
    return `${sec}s ago`;
  }, [lastUpdateTs]);

  return (
    <Screen>
      <Topbar title="Active trip" />
      <Card>
        <Text>Trip: {tripId}</Text>
        <Text>Sharing: {sharing ? 'ON' : 'OFF'}</Text>
        <Text>Last update: {lastUpdatedText}</Text>
        <Text>{offlineRetry ? 'Offline, will retry queued updates.' : 'Sync is stable.'}</Text>
        <Text>ETA: {eta?.etaSeconds ? `${Math.max(1, Math.round(Number(eta.etaSeconds) / 60))} min` : 'n/a'}</Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Start trip" onPress={() => api.trips.start(tripId).catch(() => undefined)} />
          <Button title="Complete trip" variant="secondary" onPress={() => api.trips.complete(tripId).catch(() => undefined)} />
        </View>
      </Card>

      <MapView
        center={routeCoords[0] ?? driverMarker}
        routeCoords={routeCoords}
        driver={driverMarker}
        poiMarkers={poiOnly}
        radarMarkers={radarOnly}
        showPoi={showPoi}
        showRadars={showRadars}
      >
        <Card>
          <RoutePolyline distanceMeters={routeData?.distanceMeters} durationSeconds={routeData?.durationSeconds} etaSeconds={eta?.etaSeconds} />
        </Card>
      </MapView>

      <Card>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title={showPoi ? 'Hide POI' : 'Show POI'} variant="secondary" onPress={() => setShowPoi((prev) => !prev)} />
          <Button title={showRadars ? 'Hide radars' : 'Show radars'} variant="secondary" onPress={() => setShowRadars((prev) => !prev)} />
        </View>
        <RadarLayer radars={radarOnly} />
      </Card>

      {alert ? <NearbyAlertBanner message={alert} /> : null}
    </Screen>
  );
}
