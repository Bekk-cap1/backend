import type { MapCoordinate } from '../../ui/components/Map/types';

function decodeEncodedPolyline(polyline: string): MapCoordinate[] {
  const coordinates: MapCoordinate[] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  while (index < polyline.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = polyline.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;

    do {
      byte = polyline.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dLon = result & 1 ? ~(result >> 1) : result >> 1;
    lon += dLon;

    coordinates.push({ lat: lat / 1e5, lon: lon / 1e5 });
  }

  return coordinates;
}

export function decodeRoutePolyline(polyline: string | null | undefined): MapCoordinate[] {
  if (!polyline) return [];

  if (polyline.includes(';')) {
    return polyline
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [latRaw, lonRaw] = part.split(',');
        const lat = Number(latRaw);
        const lon = Number(lonRaw);
        return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
      })
      .filter((point): point is MapCoordinate => Boolean(point));
  }

  try {
    return decodeEncodedPolyline(polyline);
  } catch {
    return [];
  }
}

export function toLatLng(coords: MapCoordinate[]) {
  return coords.map((coord) => ({ latitude: coord.lat, longitude: coord.lon }));
}
