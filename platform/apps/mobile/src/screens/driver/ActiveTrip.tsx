import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { MapView } from '../../ui/components/Map/MapView';
import { RoutePolyline } from '../../ui/components/Map/RoutePolyline';
import { RadarLayer } from '../../ui/components/Map/RadarLayer';
import { NearbyAlertBanner } from '../../ui/components/Map/NearbyAlertBanner';
import { Skeleton } from '../../ui/components/Skeleton';
import { EmptyState } from '../../ui/components/EmptyState';
import {
  TripProgressTimeline,
  type TripProgressStep,
} from '../../ui/components/TripProgressTimeline';
import { api } from '../../api/client';
import { useQuery } from '../../api/hooks/useQuery';
import { sendLocationWithQueue } from '../../api/critical-actions';
import { unwrapItems, unwrapPayload } from '../../api/mappers/dto';
import { ensureLocationPermissions } from '../../core/location/permissions';
import {
  startForegroundTracking,
  type LocationPoint,
} from '../../core/location/foreground';
import { startBackgroundTracking } from '../../core/location/background';
import { decodeRoutePolyline } from '../../core/location/polyline';
import { haversineMeters } from '../../core/location/geoMath';
import { appConfig } from '../../core/config';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import {
  shouldSendLocation,
  type LocationSendState,
} from '../../core/location/location-reliability';
import { formatDistance, formatEtaSeconds, formatStatusLabel } from '../../core/format';
import type { MapMarker } from '../../ui/components/Map/types';
import { Select } from '../../ui/components/Select';

function mapTripActionError(error: unknown) {
  const message = toErrorMessage(error);
  if (message.includes('Only published trip can be started')) {
    return 'Сначала опубликуйте поездку.';
  }
  if (message.includes('Only started trip can be completed')) {
    return 'Сначала начните поездку.';
  }
  return message;
}

function mapRadarMarkers(items: any[]): MapMarker[] {
  return items
    .filter(
      (item) =>
        Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)),
    )
    .map((item, idx) => ({
      id: String(item.id ?? `radar-${idx}`),
      lat: Number(item.lat),
      lon: Number(item.lon),
      kind:
        String(item.type ?? '').includes('speed') ||
        String(item.type ?? '').includes('hazard')
          ? 'radar'
          : 'poi',
      title: item.name ?? item.type ?? 'Радар',
      description: item.description ?? undefined,
    }));
}

export function ActiveTripScreen({ route, navigation }: { route: any; navigation: any }) {
  const tripId = String(route.params?.tripId ?? '');
  const { show } = useToast();

  const [routeData, setRouteData] = useState<any>(null);
  const [eta, setEta] = useState<any>(null);
  const [radarMarkers, setRadarMarkers] = useState<MapMarker[]>([]);
  const [sharing, setSharing] = useState(false);
  const [offlineRetry, setOfflineRetry] = useState(false);
  const [lastUpdateTs, setLastUpdateTs] = useState<number | null>(null);
  const [driverMarker, setDriverMarker] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [showRadars, setShowRadars] = useState(true);
  const [showPoi, setShowPoi] = useState(true);
  const [publishVehicleId, setPublishVehicleId] = useState('');

  const tripQuery = useQuery(
    async () => unwrapPayload<any>(await api.trips.getById(tripId)),
    [tripId],
  );
  const bookingsQuery = useQuery(
    async () => unwrapItems<any>(await api.bookings.driver()),
    [tripId],
  );
  const vehiclesQuery = useQuery(
    async () => unwrapItems<any>(await api.vehicles.listMine()),
    [],
  );

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
          await api.poi.alongRoute({
            polyline: normalizedRoute.polyline,
            bufferMeters: 1200,
          }),
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
      tripQuery.reload().catch(() => undefined);
      bookingsQuery.reload().catch(() => undefined);
    }, 5000);

    return () => clearInterval(timer);
  }, [bookingsQuery, tripId, tripQuery]);

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
        setAlert(`${radar.title ?? 'Радар'} впереди: ${Math.round(distance)} м`);
        break;
      }
    };

    const start = async () => {
      const permission = await ensureLocationPermissions();
      if (!permission.foreground) {
        show({ title: 'Доступ к геолокации отклонен', tone: 'danger' });
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

  const routeCoords = useMemo(
    () => decodeRoutePolyline(routeData?.polyline),
    [routeData?.polyline],
  );
  const radarOnly = useMemo(
    () => radarMarkers.filter((item) => item.kind === 'radar'),
    [radarMarkers],
  );
  const poiOnly = useMemo(
    () => radarMarkers.filter((item) => item.kind === 'poi'),
    [radarMarkers],
  );

  const activeBookings = useMemo(
    () =>
      (bookingsQuery.data ?? []).filter(
        (booking) =>
          String(booking.tripId) === tripId &&
          ['confirmed', 'paid'].includes(String(booking.status ?? '').toLowerCase()),
      ),
    [bookingsQuery.data, tripId],
  );

  const nextPickupAddress = useMemo(
    () =>
      String(
        activeBookings[0]?.request?.pickupAddress ??
          activeBookings[0]?.request?.dropoffAddress ??
          '',
      ).trim(),
    [activeBookings],
  );

  const timelineSteps = useMemo<TripProgressStep[]>(() => {
    const status = String(tripQuery.data?.status ?? '').toLowerCase();
    return [
      {
        id: 'draft',
        label: 'Поездка подготовлена',
        state: ['draft', 'published', 'started', 'completed'].includes(status)
          ? 'completed'
          : 'pending',
      },
      {
        id: 'published',
        label: 'Поездка опубликована',
        state: ['published', 'started', 'completed'].includes(status)
          ? 'completed'
          : status === 'draft'
            ? 'active'
            : 'pending',
      },
      {
        id: 'started',
        label: 'Поездка началась',
        state: ['started', 'completed'].includes(status)
          ? 'completed'
          : status === 'published'
            ? 'active'
            : 'pending',
      },
      {
        id: 'completed',
        label: 'Поездка завершена',
        state: status === 'completed' ? 'completed' : 'pending',
      },
    ];
  }, [tripQuery.data?.status]);
  const tripStatus = String(tripQuery.data?.status ?? '').toLowerCase();
  const tripVehicleId = String(tripQuery.data?.vehicleId ?? '').trim();
  const hasVehicleAttached = Boolean(tripVehicleId);
  const canPublish = tripStatus === 'draft';
  const canStart = tripStatus === 'published';
  const canComplete = tripStatus === 'started';
  const vehicleOptions = useMemo(
    () =>
      (vehiclesQuery.data ?? []).map((vehicle) => {
        const plate = vehicle.plateNo ?? vehicle.plate ?? vehicle.plateNumber ?? '';
        const name = [vehicle.make, vehicle.model].filter(Boolean).join(' ').trim();
        return {
          value: String(vehicle.id),
          label: name || `Авто ${plate || String(vehicle.id).slice(0, 6)}`,
          hint: plate || undefined,
        };
      }),
    [vehiclesQuery.data],
  );

  useEffect(() => {
    if (hasVehicleAttached) return;
    if (!vehicleOptions.length) return;
    if (!publishVehicleId) setPublishVehicleId(vehicleOptions[0].value);
  }, [hasVehicleAttached, publishVehicleId, vehicleOptions]);

  const lastUpdatedText = useMemo(() => {
    if (!lastUpdateTs) return 'еще нет данных';
    const sec = Math.max(1, Math.round((Date.now() - lastUpdateTs) / 1000));
    return `${sec} сек назад`;
  }, [lastUpdateTs]);

  if (tripQuery.loading && !tripQuery.data) {
    return (
      <Screen>
        <Topbar title="Активная поездка" />
        <Card>
          <Skeleton height={20} />
          <Skeleton height={18} />
          <Skeleton height={18} />
        </Card>
      </Screen>
    );
  }

  if (tripQuery.error) {
    return (
      <Screen>
        <Topbar title="Активная поездка" />
        <Card>
          <EmptyState
            title="Не удалось загрузить поездку"
            description={tripQuery.error}
            actionLabel="Повторить"
            onAction={() => tripQuery.reload()}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Topbar title="Активная поездка" />

      <Card>
        <Text style={{ fontWeight: '700' }}>
          {tripQuery.data?.fromCity?.name && tripQuery.data?.toCity?.name
            ? `${tripQuery.data.fromCity.name} -> ${tripQuery.data.toCity.name}`
            : 'Текущая поездка'}
        </Text>
        <Text>Статус: {formatStatusLabel(tripQuery.data?.status)}</Text>
        <Text>Трансляция: {sharing ? 'включена' : 'выключена'}</Text>
        <Text>Последнее обновление: {lastUpdatedText}</Text>
        <Text>
          {offlineRetry
            ? 'Нет сети: обновления в очереди.'
            : 'Синхронизация стабильна.'}
        </Text>
        <Text>ETA: {formatEtaSeconds(eta?.etaSeconds)}</Text>
        <Text>Расстояние: {formatDistance(eta?.distanceMeters)}</Text>
        <Text>
          Активные пассажиры: {activeBookings.length}
          {nextPickupAddress ? ` | Следующая посадка: ${nextPickupAddress}` : ''}
        </Text>
        {canPublish ? (
          <Text style={{ opacity: 0.8 }}>
            Поездка в черновике. Опубликуйте ее перед стартом.
          </Text>
        ) : null}
        {canPublish && !hasVehicleAttached ? (
          <>
            <Text style={{ color: '#f59e0b' }}>
              Для публикации нужно привязать автомобиль к поездке.
            </Text>
            <Select
              label="Автомобиль для публикации"
              value={publishVehicleId}
              options={vehicleOptions}
              onChange={setPublishVehicleId}
              placeholder="Выберите автомобиль"
              disabled={!vehicleOptions.length}
            />
            {!vehicleOptions.length ? (
              <Button
                title="Добавить авто"
                variant="secondary"
                onPress={() => navigation.navigate('Vehicles')}
              />
            ) : null}
          </>
        ) : null}
        <TripProgressTimeline steps={timelineSteps} />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {canPublish ? (
            <Button
              title="Опубликовать"
              disabled={!hasVehicleAttached && !publishVehicleId}
              onPress={() =>
                (async () => {
                  try {
                    if (!hasVehicleAttached) {
                      await api.trips.update(tripId, { vehicleId: publishVehicleId });
                    }
                    await api.trips.publish(tripId);
                    show({ title: 'Поездка опубликована', tone: 'success' });
                    tripQuery.reload().catch(() => undefined);
                  } catch (error) {
                    show({ title: mapTripActionError(error), tone: 'danger' });
                  }
                })()
              }
            />
          ) : null}
          <Button
            title="Начать поездку"
            disabled={!canStart}
            onPress={() =>
              api.trips
                .start(tripId)
                .then(() => {
                  show({ title: 'Поездка начата', tone: 'success' });
                  tripQuery.reload().catch(() => undefined);
                })
                .catch((error) =>
                  show({ title: mapTripActionError(error), tone: 'danger' }),
                )
            }
          />
          <Button
            title="Завершить поездку"
            variant="secondary"
            disabled={!canComplete}
            onPress={() =>
              api.trips
                .complete(tripId)
                .then(() => {
                  show({ title: 'Поездка завершена', tone: 'success' });
                  tripQuery.reload().catch(() => undefined);
                })
                .catch((error) =>
                  show({ title: mapTripActionError(error), tone: 'danger' }),
                )
            }
          />
        </View>

        {nextPickupAddress ? (
          <Button
            title="Открыть посадку в Maps"
            variant="ghost"
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextPickupAddress)}`,
              ).catch(() => undefined)
            }
          />
        ) : null}
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
          <RoutePolyline
            distanceMeters={routeData?.distanceMeters}
            durationSeconds={routeData?.durationSeconds}
            etaSeconds={eta?.etaSeconds}
          />
        </Card>
      </MapView>

      <Card>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            title={showPoi ? 'Скрыть POI' : 'Показать POI'}
            variant="secondary"
            onPress={() => setShowPoi((prev) => !prev)}
          />
          <Button
            title={showRadars ? 'Скрыть радары' : 'Показать радары'}
            variant="secondary"
            onPress={() => setShowRadars((prev) => !prev)}
          />
        </View>
        <RadarLayer radars={radarOnly} />
      </Card>

      {alert ? <NearbyAlertBanner message={alert} /> : null}
    </Screen>
  );
}
