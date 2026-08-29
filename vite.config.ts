import {defineConfig} from "vitest/config";
import {loadEnv} from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import {VitePWA} from "vite-plugin-pwa";

export default defineConfig(({mode}) => {
  // Пустой префикс: ключ называется ORS_API_KEY, без VITE_. Так и задумано —
  // всё с префиксом VITE_ попадает в бандл, а ключ туда попадать не должен.
  // process.env файл .env.local не читает, поэтому нужен loadEnv.
  const env = loadEnv(mode, process.cwd(), "");

  return {
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
          // Клиентского роутинга нет, а index.html, отданный для более
          // глубокого пути, разрешал бы относительные ссылки не туда.
          navigateFallback: undefined,
          // Ни тайлы OSM, ни ответы /ors/ не кэшируем. Тайлы — из-за правил
          // использования OSM, изохроны — потому что они привязаны к точке и
          // устаревают вместе с ней.
          navigateFallbackDenylist: [/^\/ors\//],
          runtimeCaching: []
        }
      })
    ],
    build: {
      sourcemap: true
    },
    server: {
      // Тот же путь /ors/, что и в продакшене, только здесь ключ подставляет
      // dev-сервер, а не nginx.
      proxy: {
        "/ors": {
          target: "https://api.openrouteservice.org",
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/ors/, ""),
          headers: {Authorization: env.ORS_API_KEY ?? ""}
        }
      }
    },
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}"]
    }
  };
});
