export type MapCoordinate = {
  lat: number;
  lon: number;
};

export type MapMarkerKind = 'driver' | 'poi' | 'radar' | 'pickup' | 'dropoff';

export type MapMarker = {
  id: string;
  lat: number;
  lon: number;
  title?: string;
  description?: string;
  kind: MapMarkerKind;
  count?: number;
  radiusMeters?: number;
};
