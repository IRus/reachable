import {defineConfig} from "vitest/config";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import {VitePWA} from "vite-plugin-pwa";

export default defineConfig({
  // Относительный, чтобы приложение работало и из корня контейнера, и под
  // любым префиксом, если когда-нибудь переедет за проксирующий префикс.
  base: "./",
  plugins: [
    react(),
    // Геолокация в браузере работает только в защищённом контексте. localhost
    // считается защищённым, а http://192.168.x.x — нет, поэтому проверка с
    // телефона в локальной сети требует https.
    basicSsl(),
    VitePWA({
      strategies: "generateSW",
      // index.html регистрирует воркер сам, чтобы один раз перезагрузить
      // страницу, когда новый воркер взял управление.
      injectRegister: false,
      // Манифест — статический файл в public/, здесь его не генерируем.
      manifest: false,
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,png,svg,ico,json}"],
        // Клиентского роутинга нет, а index.html, отданный для более глубокого
        // пути, разрешал бы относительные ссылки не туда.
        navigateFallback: undefined,
        navigateFallbackDenylist: [/^\/iso\//],
        // Ни тайлы OSM, ни ответы /iso/ не кэшируем. Тайлы — из-за правил
        // использования OSM, изохроны — потому что они привязаны к точке и
        // устаревают вместе с ней.
        runtimeCaching: []
      }
    })
  ],
  build: {
    sourcemap: true
  },
  server: {
    // Тот же путь /iso/, что и в продакшене, только проксирует dev-сервер,
    // а не nginx.
    proxy: {
      "/iso": {
        target: "https://valhalla1.openstreetmap.de",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/iso/, "")
      }
    }
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"]
  }
});
