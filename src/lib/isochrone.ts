import type {LatLon, Ring} from "./geo";
import {MODES, type Mode} from "./travel";

/**
 * Полигон изохроны как список колец. Первое кольцо — внешний контур, остальные
 * — дырки внутри него. Leaflet понимает ровно такой формат.
 */
export type Rings = readonly Ring[];

export type IsochroneErrorKind = "offline" | "rate-limited" | "empty" | "server";

export class IsochroneError extends Error {
  constructor(readonly kind: IsochroneErrorKind, message: string) {
    super(message);
    this.name = "IsochroneError";
  }
}

/**
 * Запрос идёт на собственный origin, а не в Valhalla напрямую. Так нет заботы
 * о CORS, а nginx заодно ограничивает частоту запросов: считает общественный
 * сервер FOSSGIS, и грузить его нельзя. base у Vite относительный, отсюда
 * document.baseURI.
 */
function endpoint(): string {
  return new URL("iso/isochrone", document.baseURI).toString();
}

function ringFromGeoJson(coordinates: readonly (readonly number[])[]): Ring {
  // GeoJSON — это [долгота, широта]. Leaflet ждёт обратный порядок.
  // Перепутать здесь — самая частая ошибка в таком коде.
  return coordinates.map(([lon, lat]) => [lat!, lon!] as const);
}

function ringsFromGeometry(geometry: {type?: string; coordinates?: unknown}): Rings {
  const coords = geometry.coordinates;
  if (!Array.isArray(coords)) return [];

  if (geometry.type === "Polygon") {
    return (coords as readonly (readonly (readonly number[])[])[]).map(ringFromGeoJson);
  }

  if (geometry.type === "MultiPolygon") {
    // Несколько несвязанных кусков бывают, когда стартовая точка отрезана от
    // части сети. Берём самый большой — он и есть основная зона.
    const polygons = coords as readonly (readonly (readonly number[])[])[][];
    const biggest = polygons
      .slice()
      .sort((a, b) => (b[0]?.length ?? 0) - (a[0]?.length ?? 0))[0];
    return biggest ? biggest.map(ringFromGeoJson) : [];
  }

  return [];
}

export interface IsochroneRequest {
  readonly center: LatLon;
  readonly minutes: number;
  readonly mode: Mode;
  readonly signal?: AbortSignal;
}

export async function fetchIsochrone(request: IsochroneRequest): Promise<Rings> {
  const {center, minutes, mode, signal} = request;

  let response: Response;
  try {
    response = await fetch(endpoint(), {
      method: "POST",
      signal,
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        locations: [{lat: center.lat, lon: center.lon}],
        costing: MODES[mode].costing,
        contours: [{time: minutes}],
        // Без этого Valhalla вернёт линии, а не залитый полигон.
        polygons: true
      })
    });
  } catch (cause) {
    // Отмену пробрасываем как есть: её обрабатывает вызывающий код.
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new IsochroneError("offline", "Нет связи с сервисом маршрутов");
  }

  if (response.status === 429) {
    throw new IsochroneError("rate-limited", "Слишком много запросов, попробуй позже");
  }
  if (!response.ok) {
    throw new IsochroneError("server", `Сервис маршрутов ответил ${response.status}`);
  }

  const body = (await response.json()) as {
    features?: readonly {geometry?: {type?: string; coordinates?: unknown}}[];
  };

  const geometry = body.features?.[0]?.geometry;
  const rings = geometry ? ringsFromGeometry(geometry) : [];

  // Пустой результат приходит, если рядом со стартовой точкой нет дорог.
  if (rings.length === 0 || (rings[0]?.length ?? 0) < 3) {
    throw new IsochroneError("empty", "Рядом нет дорог, по которым можно считать");
  }

  return rings;
}
