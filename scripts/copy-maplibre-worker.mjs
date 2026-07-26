// Self-hosts the maplibre-gl worker in public/ — Turbopack's import.meta.url
// doesn't resolve to an http(s) URL inside bundled chunks, so maplibre-gl's
// own worker auto-discovery (getWorkerUrl) returns an empty string and the
// map never fetches tiles. lib/map.ts points config.WORKER_URL here instead.
// Re-run automatically via postinstall whenever maplibre-gl is updated.
import { copyFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const workerPath = require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs");
// The worker bundle imports its shared chunk via a relative specifier
// ("./maplibre-gl-shared.mjs"), so that file has to sit next to it in public/ too.
const sharedPath = require.resolve("maplibre-gl/dist/maplibre-gl-shared.mjs");
copyFileSync(workerPath, new URL("../public/maplibre-gl-worker.mjs", import.meta.url));
copyFileSync(sharedPath, new URL("../public/maplibre-gl-shared.mjs", import.meta.url));
