import {clampMinutes, MAX_MINUTES, MIN_MINUTES, MODE_LIST, type Mode} from "../lib/travel";

interface Props {
  readonly minutes: number;
  readonly mode: Mode;
  readonly onMinutesChange: (minutes: number) => void;
  readonly onModeChange: (mode: Mode) => void;
}

export function Controls({minutes, mode, onMinutesChange, onModeChange}: Props) {
  return (
    <section className="controls">
      <div className="controls__modes" role="group" aria-label="Способ передвижения">
        {MODE_LIST.map((spec) => (
          <button
            key={spec.id}
            type="button"
            className="chip"
            aria-pressed={spec.id === mode}
            onClick={() => onModeChange(spec.id)}
          >
            {spec.label}
          </button>
        ))}
      </div>

      <label className="controls__minutes" htmlFor="minutes">
        <span className="controls__caption">За сколько минут</span>
        <input
          id="minutes"
          className="controls__number"
          type="number"
          inputMode="numeric"
          min={MIN_MINUTES}
          max={MAX_MINUTES}
          value={minutes}
          onChange={(event) => onMinutesChange(clampMinutes(event.target.valueAsNumber))}
        />
      </label>

      <input
        className="controls__slider"
        type="range"
        aria-label="Минуты"
        min={MIN_MINUTES}
        max={MAX_MINUTES}
        step={1}
        value={minutes}
        onChange={(event) => onMinutesChange(clampMinutes(event.target.valueAsNumber))}
      />
    </section>
  );
}
