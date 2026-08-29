import {useEffect, useState} from "react";
import {Controls} from "./components/Controls";
import {MapView} from "./components/MapView";
import {StatusBar} from "./components/StatusBar";
import {useGeolocation} from "./hooks/useGeolocation";
import {useIsochrone} from "./hooks/useIsochrone";
import {clampMinutes, MODES, type Mode} from "./lib/travel";

const STORE_MINUTES = "reachable.minutes";
const STORE_MODE = "reachable.mode";

function readMinutes(): number {
  const raw = localStorage.getItem(STORE_MINUTES);
  return raw === null ? 15 : clampMinutes(Number(raw));
}

function readMode(): Mode {
  const raw = localStorage.getItem(STORE_MODE);
  return raw === "cycling" ? "cycling" : "walking";
}

export function App() {
  const [minutes, setMinutes] = useState(readMinutes);
  const [mode, setMode] = useState<Mode>(readMode);

  useEffect(() => {
    localStorage.setItem(STORE_MINUTES, String(minutes));
  }, [minutes]);

  useEffect(() => {
    localStorage.setItem(STORE_MODE, mode);
  }, [mode]);

  const geo = useGeolocation();
  const {zone, loading, notice} = useIsochrone(geo.position, minutes, mode);

  let status: {text: string; tone: "ok" | "warn" | "busy"};
  if (geo.error && !geo.position) {
    status = {text: geo.error.message, tone: "warn"};
  } else if (geo.pending) {
    status = {text: "Ищу, где ты…", tone: "busy"};
  } else if (loading) {
    status = {text: "Считаю зону…", tone: "busy"};
  } else if (notice) {
    status = {text: `${notice}. Показан круг, а не улицы.`, tone: "warn"};
  } else if (zone) {
    const accuracy = geo.position ? Math.round(geo.position.accuracy) : 0;
    status = {
      text: `${MODES[mode].label.toLowerCase()}, ${minutes} мин · точность ${accuracy} м`,
      tone: "ok"
    };
  } else {
    status = {text: "Готово к работе", tone: "ok"};
  }

  return (
    <main className="app">
      <MapView position={geo.position} zone={zone} />
      <div className="panel">
        <StatusBar text={status.text} tone={status.tone} />
        <Controls
          minutes={minutes}
          mode={mode}
          onMinutesChange={setMinutes}
          onModeChange={setMode}
        />
      </div>
    </main>
  );
}
