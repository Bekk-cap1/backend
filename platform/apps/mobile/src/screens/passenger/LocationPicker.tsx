import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { EmptyState } from '../../ui/components/EmptyState';
import { Chip } from '../../ui/components/Chip';
import { MapView } from '../../ui/components/Map/MapView';
import type { MapCoordinate, MapMarker } from '../../ui/components/Map/types';
import { api } from '../../api/client';
import { unwrapItems, unwrapPayload } from '../../api/mappers/dto';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import { useTheme } from '../../ui/theme/ThemeProvider';
import { getCached, setCached } from '../../core/cache/simple-cache';

type LocationMode = 'pickup' | 'dropoff';
type PlaceSuggestion = {
  id: string;
  title: string;
  subtitle?: string;
  displayName?: string;
  lat: number;
  lon: number;
};

type RecentPlace = {
  id: string;
  title: string;
  lat: number;
  lon: number;
};

const recentCacheKey = 'places:recent';

function uniquePlaceId(title: string, lat: number, lon: number) {
  return `${title}|${lat.toFixed(5)}|${lon.toFixed(5)}`;
}

export function LocationPickerScreen({ route, navigation }: { route: any; navigation: any }) {
  const mode: LocationMode = route.params?.mode === 'dropoff' ? 'dropoff' : 'pickup';
  const initialPoint = (route.params?.currentPoint ?? null) as MapCoordinate | null;
  const initialAddress = typeof route.params?.currentAddress === 'string' ? route.params.currentAddress : '';

  const { show } = useToast();
  const { theme } = useTheme();
  const [search, setSearch] = useState<string>(initialAddress);
  const [selectedPoint, setSelectedPoint] = useState<MapCoordinate | null>(initialPoint);
  const [selectedAddress, setSelectedAddress] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [recentPlaces, setRecentPlaces] = useState<RecentPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    getCached<RecentPlace[]>(recentCacheKey)
      .then((cached) => setRecentPlaces(cached ?? []))
      .catch(() => undefined);
  }, []);

  const saveRecentPlace = async (title: string, point: MapCoordinate) => {
    const place: RecentPlace = {
      id: uniquePlaceId(title, point.lat, point.lon),
      title,
      lat: point.lat,
      lon: point.lon,
    };
    const next = [place, ...recentPlaces.filter((item) => item.id !== place.id)].slice(0, 6);
    setRecentPlaces(next);
    await setCached(recentCacheKey, next, 30 * 24 * 60 * 60 * 1000);
  };

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const response = await api.geo.placesAutocomplete({ q, limit: 8 });
        setSuggestions(unwrapItems<PlaceSuggestion>(response));
      } catch (error) {
        setSearchError(toErrorMessage(error));
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  const markers = useMemo<MapMarker[]>(
    () =>
      selectedPoint
        ? [
            {
              id: `${mode}-marker`,
              lat: selectedPoint.lat,
              lon: selectedPoint.lon,
              kind: mode,
              title: mode === 'pickup' ? 'Посадка' : 'Высадка',
            },
          ]
        : [],
    [mode, selectedPoint],
  );

  const pickFromCurrentLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        show({ title: 'Доступ к геолокации отклонен', tone: 'danger' });
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { lat: current.coords.latitude, lon: current.coords.longitude };
      setSelectedPoint(point);
      const reverse = unwrapPayload<any>(await api.geo.placesReverse(point));
      const displayName = String(reverse?.displayName ?? reverse?.title ?? '');
      setSelectedAddress(displayName);
      setSearch(displayName);
      setSuggestions([]);
      await saveRecentPlace(displayName || 'Текущая геопозиция', point);
    } catch (error) {
      show({ title: toErrorMessage(error), tone: 'danger' });
    }
  };

  const confirm = async () => {
    if (!selectedPoint) {
      show({ title: 'Выберите точку на карте или из поиска', tone: 'danger' });
      return;
    }

    await saveRecentPlace(
      selectedAddress || search.trim() || (mode === 'pickup' ? 'Точка посадки' : 'Точка высадки'),
      selectedPoint,
    );

    navigation.navigate('CreateRequest', {
      locationSelection: {
        mode,
        point: selectedPoint,
        address: selectedAddress || search.trim() || '',
        timestamp: Date.now(),
      },
    });
  };

  return (
    <Screen>
      <Topbar title={mode === 'pickup' ? 'Точка посадки' : 'Точка высадки'} right={<Button title="Назад" variant="ghost" onPress={() => navigation.goBack()} />} />

      <Card>
        <Input
          label="Поиск адреса"
          value={search}
          onChangeText={setSearch}
          placeholder="Введите адрес или ориентир"
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Моя геопозиция" variant="secondary" onPress={pickFromCurrentLocation} />
          <Button
            title="Очистить"
            variant="ghost"
            onPress={() => {
              setSearch('');
              setSelectedAddress('');
              setSuggestions([]);
            }}
          />
        </View>
      </Card>

      {recentPlaces.length > 0 ? (
        <Card>
          <Text style={{ fontWeight: '700' }}>Недавние точки</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {recentPlaces.map((item) => (
              <Chip
                key={item.id}
                label={item.title}
                onPress={() => {
                  setSelectedPoint({ lat: item.lat, lon: item.lon });
                  setSelectedAddress(item.title);
                  setSearch(item.title);
                  setSuggestions([]);
                }}
              />
            ))}
          </View>
        </Card>
      ) : null}

      <MapView
        center={selectedPoint}
        customMarkers={markers}
        onMapPress={async (point) => {
          setSelectedPoint(point);
          try {
            const reverse = unwrapPayload<any>(await api.geo.placesReverse(point));
            const displayName = String(reverse?.displayName ?? reverse?.title ?? '');
            setSelectedAddress(displayName);
            setSearch(displayName);
          } catch {
            // Reverse geocoding may fail. Coordinates are still valid.
          }
        }}
      />

      <Card>
        <Text style={{ fontWeight: '700' }}>Подсказки</Text>
        {searching ? <Text>Ищем адрес...</Text> : null}
        {searchError ? (
          <EmptyState
            title="Не удалось загрузить адреса"
            description={searchError}
            actionLabel="Повторить"
            onAction={() => setSearch((prev) => prev + ' ')}
          />
        ) : null}

        {!searchError && !searching && suggestions.length === 0 ? (
          <Text style={{ opacity: 0.75 }}>Введите минимум 2 символа для поиска адреса.</Text>
        ) : null}

        {suggestions.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              setSelectedPoint({ lat: item.lat, lon: item.lon });
              setSelectedAddress(item.displayName ?? item.title);
              setSearch(item.displayName ?? item.title);
              setSuggestions([]);
            }}
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontWeight: '600' }}>{item.title}</Text>
            <Text style={{ opacity: 0.72 }}>{item.displayName ?? item.subtitle ?? ''}</Text>
          </Pressable>
        ))}
      </Card>

      <Card>
        <Text style={{ opacity: 0.8 }}>
          {selectedPoint ? `${selectedPoint.lat.toFixed(5)}, ${selectedPoint.lon.toFixed(5)}` : 'Точка не выбрана'}
        </Text>
        <Button title={mode === 'pickup' ? 'Подтвердить посадку' : 'Подтвердить высадку'} onPress={confirm} disabled={!selectedPoint} />
      </Card>
    </Screen>
  );
}
