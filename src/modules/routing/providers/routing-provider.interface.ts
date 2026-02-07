export type Coordinate = {
  lat: number;
  lon: number;
};

export type RouteResult = {
  provider: string;
  polyline: string;
  distanceMeters: number;
  durationSeconds: number;
  bbox: [number, number, number, number];
};

export interface RoutingProvider {
  readonly name: string;
  route(from: Coordinate, to: Coordinate): Promise<RouteResult>;
}
