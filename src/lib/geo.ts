/** Точка в порядке, привычном браузеру и Leaflet: сначала широта. */
export interface LatLon {
  readonly lat: number;
  readonly lon: number;
}

/** Кольцо полигона в порядке Leaflet: [широта, долгота]. */
export type Ring = readonly (readonly [number, number])[];

const EARTH_RADIUS_M = 6_371_008.8;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Расстояние по большому кругу. Нужно только чтобы решить, сдвинулся ли
 * пользователь достаточно далеко для нового запроса изохроны, поэтому шара
 * вместо эллипсоида здесь более чем достаточно.
 */
export function distanceMeters(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Круг заданного радиуса как кольцо полигона. Это запасной вариант: он не знает
 * про улицы и показывает расстояние по прямой, а не реальную доступность.
 */
export function circleRing(center: LatLon, radiusMeters: number, steps = 96): Ring {
  const latRad = toRad(center.lat);
  const dLat = (radiusMeters / EARTH_RADIUS_M) * (180 / Math.PI);
  // На широте центра меридианы сходятся, поэтому шаг по долготе шире.
  // У полюса cos обращается в ноль, и деление на него дало бы бесконечность.
  const cos = Math.cos(latRad);
  const dLon = cos < 1e-6 ? 180 : dLat / cos;

  const ring: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const angle = (2 * Math.PI * i) / steps;
    ring.push([
      center.lat + dLat * Math.cos(angle),
      center.lon + dLon * Math.sin(angle)
    ]);
  }
  // Кольцо замкнуто явно: первая точка повторяется в конце.
  ring.push(ring[0]!);
  return ring;
}
