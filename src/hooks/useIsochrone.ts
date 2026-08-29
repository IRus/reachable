import {useEffect, useRef, useState} from "react";
import {circleRing, distanceMeters, type LatLon} from "../lib/geo";
import {fetchIsochrone, IsochroneError, type Rings} from "../lib/isochrone";
import {reachDistanceMeters, type Mode} from "../lib/travel";

/**
 * Насколько нужно сдвинуться, чтобы пересчитать зону. GPS шевелит координату
 * на несколько метров даже у лежащего на столе телефона, и без этого порога
 * каждый такой тик уходил бы в API.
 */
const MOVE_THRESHOLD_M = 30;

/** Пауза после последнего движения слайдера, чтобы не слать запрос на каждый шаг. */
const DEBOUNCE_MS = 400;

export type ZoneSource = "streets" | "circle";

export interface Zone {
  readonly rings: Rings;
  readonly source: ZoneSource;
}

export interface IsochroneState {
  readonly zone: Zone | null;
  readonly loading: boolean;
  readonly notice: string | null;
}

/** Ключ кэша. Координаты округляем, иначе кэш не попадёт никогда. */
function cacheKey(center: LatLon, minutes: number, mode: Mode): string {
  return `${center.lat.toFixed(4)},${center.lon.toFixed(4)},${minutes},${mode}`;
}

export function useIsochrone(
  center: LatLon | null,
  minutes: number,
  mode: Mode
): IsochroneState {
  const [state, setState] = useState<IsochroneState>({
    zone: null,
    loading: false,
    notice: null
  });

  const cache = useRef(new Map<string, Rings>());
  // Точка последнего успешного запроса. Пока от неё не отошли дальше порога,
  // новый запрос не нужен.
  const anchor = useRef<LatLon | null>(null);

  useEffect(() => {
    if (!center) return;

    const moved =
      !anchor.current || distanceMeters(anchor.current, center) > MOVE_THRESHOLD_M;
    const target = moved ? center : anchor.current!;

    const key = cacheKey(target, minutes, mode);
    const cached = cache.current.get(key);
    if (cached) {
      setState({zone: {rings: cached, source: "streets"}, loading: false, notice: null});
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const timer = setTimeout(async () => {
      setState((previous) => ({...previous, loading: true}));
      try {
        const rings = await fetchIsochrone({
          center: target,
          minutes,
          mode,
          signal: controller.signal
        });
        if (cancelled) return;
        cache.current.set(key, rings);
        anchor.current = target;
        setState({zone: {rings, source: "streets"}, loading: false, notice: null});
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        // Показать круг лучше, чем пустую карту: он честно подписан как
        // приблизительный и всё равно даёт масштаб.
        const rings = [circleRing(target, reachDistanceMeters(mode, minutes))];
        anchor.current = target;
        setState({
          zone: {rings, source: "circle"},
          loading: false,
          notice:
            error instanceof IsochroneError
              ? error.message
              : "Не удалось построить зону по улицам"
        });
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [center?.lat, center?.lon, minutes, mode]);

  return state;
}
