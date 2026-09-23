import { describe, expect, it } from "vitest";
import { CITIES, DISTRICT_PLACES, KAZAKHSTAN, MAP_PLACES } from "@/data/mapPlaces";
import { mapUrl, parseMapWorkspace, searchMapPlaces, workspaceToGeoJSON } from "@/lib/mapWorkspace";

const saved = { placeId: "district-esil", note: "Нужен парк", updatedAt: "2026-09-23T10:00:00.000Z" };

describe("map workspace", () => {
  it("starts with an empty workspace and restores valid notes", () => {
    expect(parseMapWorkspace(null)).toEqual({ version: 1, places: [] });
    expect(parseMapWorkspace(JSON.stringify({ version: 1, places: [saved, saved] })).places).toEqual([saved]);
  });
  it.each([
    "broken json", JSON.stringify({ version: 2, places: [] }),
    JSON.stringify({ version: 1, places: [{ ...saved, placeId: "unknown" }] }),
    JSON.stringify({ version: 1, places: [{ ...saved, placeId: "toString" }] }),
    JSON.stringify({ version: 1, places: [{ ...saved, note: "x".repeat(1001) }] }),
    JSON.stringify({ version: 1, places: [{ ...saved, updatedAt: "yesterday" }] }),
  ])("rejects corrupted storage without accepting unknown places", (raw) => {
    expect(() => parseMapWorkspace(raw)).toThrow();
  });
  it("exports actual longitudes first and retains district identity and notes", () => {
    const feature = workspaceToGeoJSON({ version: 1, places: [saved] }).features[0];
    expect(feature.geometry.coordinates).toEqual([DISTRICT_PLACES.esil.longitude, DISTRICT_PLACES.esil.latitude]);
    expect(feature.properties).toMatchObject({ districtId: "esil", note: "Нужен парк", category: "district" });
  });
  it("keeps Almaty city separate from the Astana district", () => {
    const results = searchMapPlaces(MAP_PLACES, "Алматы");
    expect(results.map((place) => place.id)).toEqual(["almaty-city", "district-almaty"]);
    expect(searchMapPlaces(MAP_PLACES, "алматы район").map((place) => place.id)).toEqual(["district-almaty"]);
    expect(searchMapPlaces(CITIES, "Өскемен")[0].id).toBe("oskemen");
  });
  it("builds centered Yandex maps with layer and bounded zoom", () => {
    const map = new URL(mapUrl(KAZAKHSTAN, "satellite", 30));
    expect(map.origin + map.pathname).toBe("https://yandex.ru/map-widget/v1/");
    expect(map.searchParams.get("ll")).toBe("67.5,48.5");
    expect(map.searchParams.get("l")).toBe("sat,skl");
    expect(map.searchParams.get("z")).toBe("18");
    const traffic = new URL(mapUrl(DISTRICT_PLACES.almaty, "traffic", 0, false));
    expect(traffic.pathname).toBe("/maps/");
    expect(traffic.searchParams.get("l")).toBe("map,trf");
    expect(traffic.searchParams.get("z")).toBe("3");
  });
});
