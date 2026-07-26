import * as maplibregl from "maplibre-gl";

// Turbopack's import.meta.url doesn't resolve to an http(s) URL inside bundled
// chunks, so maplibre-gl's own worker auto-discovery comes back empty and the
// map silently never fetches tiles. Point it at the self-hosted copy instead
// (see scripts/copy-maplibre-worker.mjs).
maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

export default maplibregl;
