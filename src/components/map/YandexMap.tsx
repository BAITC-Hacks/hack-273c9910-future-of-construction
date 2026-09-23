"use client";

import type { MapPlace } from "@/data/mapPlaces";
import { mapUrl, type MapLayer } from "@/lib/mapWorkspace";

export function YandexMap({ place, layer = "map", zoom = place.zoom, className = "", refreshKey = 0 }: {
  place: MapPlace;
  layer?: MapLayer;
  zoom?: number;
  className?: string;
  refreshKey?: number;
}) {
  return <iframe
    key={`${place.id}-${layer}-${zoom}-${refreshKey}`}
    className={`yandex-map ${className}`}
    src={mapUrl(place, layer, zoom)}
    title={`Яндекс Карта: ${place.name}${place.kind === "district" ? ", район Астаны" : ""}`}
    width="100%"
    height="100%"
    style={{ display: "block", border: 0, width: "100%", height: "100%", minHeight: 280 }}
    loading="lazy"
    allowFullScreen
    referrerPolicy="strict-origin-when-cross-origin"
  />;
}
