import { MAP_PLACES_BY_ID, type MapPlace } from "@/data/mapPlaces";

export type MapLayer = "map" | "satellite" | "traffic";
export type SavedPlace = { placeId: string; note: string; updatedAt: string };
export type MapWorkspace = { version: 1; places: SavedPlace[] };
export const MAP_STORAGE_KEY = "akim-map-workspace-v1";
export const MAX_NOTE_LENGTH = 1000;

export function parseMapWorkspace(raw: string | null): MapWorkspace {
  if (!raw) return { version: 1, places: [] };
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1 || !("places" in value) || !Array.isArray(value.places)) {
    throw new Error("Неверный формат сохранённых мест.");
  }
  const seen = new Set<string>();
  const places: SavedPlace[] = [];
  for (const item of value.places) {
    if (!item || typeof item !== "object" || typeof item.placeId !== "string" || !Object.hasOwn(MAP_PLACES_BY_ID, item.placeId) || typeof item.note !== "string" || item.note.length > MAX_NOTE_LENGTH || typeof item.updatedAt !== "string" || !Number.isFinite(Date.parse(item.updatedAt))) {
      throw new Error("Сохранённые места повреждены.");
    }
    if (!seen.has(item.placeId)) {
      places.push({ placeId: item.placeId, note: item.note, updatedAt: item.updatedAt });
      seen.add(item.placeId);
    }
  }
  return { version: 1, places };
}

export function mapUrl(place: MapPlace, layer: MapLayer = "map", zoom = place.zoom, embed = true): string {
  const url = new URL(embed ? "https://yandex.ru/map-widget/v1/" : "https://yandex.ru/maps/");
  url.searchParams.set("ll", `${place.longitude},${place.latitude}`);
  url.searchParams.set("z", String(Math.max(3, Math.min(18, Number.isFinite(zoom) ? Math.round(zoom) : place.zoom))));
  url.searchParams.set("l", layer === "satellite" ? "sat,skl" : layer === "traffic" ? "map,trf" : "map");
  url.searchParams.set("lang", "ru_RU");
  return url.toString();
}

export function workspaceToGeoJSON(workspace: MapWorkspace) {
  return {
    type: "FeatureCollection" as const,
    features: workspace.places.flatMap((saved) => {
      const place = MAP_PLACES_BY_ID[saved.placeId];
      if (!place) return [];
      return [{
        type: "Feature" as const,
        id: place.id,
        geometry: { type: "Point" as const, coordinates: [place.longitude, place.latitude] },
        properties: { name: place.name, category: place.kind, description: place.subtitle, districtId: place.districtId ?? null, note: saved.note, updatedAt: saved.updatedAt, coordinateMeaning: "Approximate map focus; not an administrative boundary" },
      }];
    }),
  };
}

export function searchMapPlaces(places: MapPlace[], query: string): MapPlace[] {
  const words = query.toLocaleLowerCase("ru").trim().split(/\s+/).filter(Boolean);
  return places.filter((place) => {
    const text = `${place.name} ${place.subtitle} ${place.keywords ?? ""}`.toLocaleLowerCase("ru");
    return words.every((word) => text.includes(word));
  });
}
