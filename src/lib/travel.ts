/**
 * Режимы передвижения. Значение `costing` — имя модели движения в Valhalla,
 * оно уходит в тело запроса. `metersPerMinute` нужен только запасному кругу,
 * когда изохрону получить не удалось.
 */
export type Mode = "walking" | "cycling";

export interface ModeSpec {
  readonly id: Mode;
  readonly costing: string;
  readonly label: string;
  readonly metersPerMinute: number;
}

export const MODES: Readonly<Record<Mode, ModeSpec>> = {
  walking: {
    id: "walking",
    costing: "pedestrian",
    label: "Пешком",
    // 5 км/ч — обычный шаг взрослого по городу.
    metersPerMinute: 5000 / 60
  },
  cycling: {
    id: "cycling",
    costing: "bicycle",
    label: "На велосипеде",
    // 15 км/ч — неспешная городская езда со светофорами.
    metersPerMinute: 15000 / 60
  }
};

export const MODE_LIST: readonly ModeSpec[] = [MODES.walking, MODES.cycling];

/**
 * Верхняя граница контура. Публичный сервер FOSSGIS считает и больше, но час
 * пешком — это уже около пяти километров, дальше карта теряет смысл.
 */
export const MAX_MINUTES = 60;
export const MIN_MINUTES = 5;

export function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return MIN_MINUTES;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(minutes)));
}

/** Расстояние по прямой, которое покрывается за `minutes` в этом режиме. */
export function reachDistanceMeters(mode: Mode, minutes: number): number {
  return MODES[mode].metersPerMinute * minutes;
}
