import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
// Без этого стиля Leaflet раскладывает тайлы в столбик и карта выглядит сломанной.
import "leaflet/dist/leaflet.css";
import "./styles.css";
import {App} from "./App";

const container = document.getElementById("root");
if (!container) throw new Error("Не найден корневой элемент #root");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
