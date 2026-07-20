import type { StyleSpecification } from "maplibre-gl";

// Free, keyless OSM-based vector tiles — no signup, no rate-limit wall.
// https://openfreemap.org
export const STREETS_STYLE = "https://tiles.openfreemap.org/styles/liberty";

// Free, keyless satellite raster tiles. Usage policy allows light/non-heavy
// traffic without a key — fine for this app's scale. If usage grows,
// swap for a paid provider (Mapbox/MapTiler/Maxar) with the same
// StyleSpecification shape.
export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [{ id: "esri-satellite", type: "raster", source: "esri" }],
};

export type BaseStyle = "streets" | "satellite";

export function styleFor(base: BaseStyle): string | StyleSpecification {
  return base === "streets" ? STREETS_STYLE : SATELLITE_STYLE;
}
