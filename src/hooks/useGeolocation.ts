import {useEffect, useState} from "react";
import type {LatLon} from "../lib/geo";

export type GeoErrorKind = "denied" | "unavailable" | "timeout" | "unsupported";

export interface GeoState {
  readonly position: (LatLon & {accuracy: number}) | null;
  readonly error: {kind: GeoErrorKind; message: string} | null;
  readonly pending: boolean;
}

const MESSAGES: Record<GeoErrorKind, string> = {
  denied: "Нет доступа к геопозиции. Разреши его в настройках браузера.",
  unavailable: "Не получается определить место. Проверь, включён ли GPS.",
  timeout: "Место определяется слишком долго. Попробуй выйти на открытое место.",
  unsupported: "Этот браузер не умеет определять место."
};

function kindOf(code: number): GeoErrorKind {
  if (code === 1) return "denied";
  if (code === 3) return "timeout";
  return "unavailable";
}

/**
 * Следит за геопозицией всё время, пока приложение открыто. watchPosition, а не
 * getCurrentPosition: первая координата обычно грубая (по сети), и точность
 * подтягивается через несколько секунд.
 */
export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({
    position: null,
    error: null,
    pending: true
  });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState({
        position: null,
        error: {kind: "unsupported", message: MESSAGES.unsupported},
        pending: false
      });
      return;
    }

    const id = navigator.geolocation.watchPosition(
      ({coords}) => {
        setState({
          position: {lat: coords.latitude, lon: coords.longitude, accuracy: coords.accuracy},
          error: null,
          pending: false
        });
      },
      (error) => {
        const kind = kindOf(error.code);
        // Уже полученную позицию не выбрасываем: потеря сигнала на минуту не
        // повод стирать карту.
        setState((previous) => ({
          position: previous.position,
          error: {kind, message: MESSAGES[kind]},
          pending: false
        }));
      },
      {enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000}
    );

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return state;
}
