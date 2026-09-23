import type { DistrictId } from "@/domain/types";

export type MapPlace = {
  id: string;
  name: string;
  subtitle: string;
  kind: "country" | "city" | "district";
  longitude: number;
  latitude: number;
  zoom: number;
  districtId?: DistrictId;
  keywords?: string;
};

export const KAZAKHSTAN: MapPlace = {
  id: "kazakhstan", name: "Казахстан", subtitle: "Вся страна на одной карте",
  kind: "country", longitude: 67.5, latitude: 48.5, zoom: 5,
  keywords: "Қазақстан Kazakhstan",
};

export const CITIES: MapPlace[] = [
  { id: "astana", name: "Астана", longitude: 71.4304, latitude: 51.1282, keywords: "Astana Астана Нур-Султан" },
  { id: "almaty-city", name: "Алматы", longitude: 76.9455, latitude: 43.2389, keywords: "Almaty Алма-Ата" },
  { id: "shymkent", name: "Шымкент", longitude: 69.5901, latitude: 42.3155, keywords: "Shymkent Чимкент" },
  { id: "karaganda", name: "Караганда", longitude: 73.0855, latitude: 49.8064, keywords: "Karaganda Қарағанды" },
  { id: "aktobe", name: "Актобе", longitude: 57.167, latitude: 50.2839, keywords: "Aktobe Ақтөбе" },
  { id: "atyrau", name: "Атырау", longitude: 51.9238, latitude: 47.105, keywords: "Atyrau" },
  { id: "aktau", name: "Актау", longitude: 51.1975, latitude: 43.6354, keywords: "Aktau Ақтау" },
  { id: "turkistan", name: "Туркестан", longitude: 68.2517, latitude: 43.2973, keywords: "Turkistan Түркістан" },
  { id: "kokshetau", name: "Кокшетау", longitude: 69.3893, latitude: 53.2833, keywords: "Kokshetau Көкшетау" },
  { id: "kostanay", name: "Костанай", longitude: 63.6246, latitude: 53.2144, keywords: "Kostanay Қостанай" },
  { id: "pavlodar", name: "Павлодар", longitude: 76.9574, latitude: 52.2873, keywords: "Pavlodar" },
  { id: "oskemen", name: "Усть-Каменогорск", longitude: 82.6138, latitude: 49.9483, keywords: "Oskemen Өскемен Усть Каменогорск" },
].map((city) => ({ ...city, kind: "city", subtitle: "Город · Казахстан", zoom: 12 }));

// Approximate focus points, not administrative district boundaries.
export const ASTANA_DISTRICTS: MapPlace[] = [
  { id: "district-esil", districtId: "esil", name: "Есиль", longitude: 71.428, latitude: 51.113, keywords: "Esil Есіл" },
  { id: "district-almaty", districtId: "almaty", name: "Алматы", longitude: 71.49, latitude: 51.145, keywords: "Almaty" },
  { id: "district-saryarka", districtId: "saryarka", name: "Сарыарка", longitude: 71.408, latitude: 51.188, keywords: "Saryarka Сарыарқа" },
  { id: "district-baikonyr", districtId: "baikonyr", name: "Байконур", longitude: 71.455, latitude: 51.187, keywords: "Baikonyr Байқоңыр" },
  { id: "district-nura", districtId: "nura", name: "Нура", longitude: 71.377, latitude: 51.12, keywords: "Nura Нұра" },
].map((district) => ({ ...district, districtId: district.districtId as DistrictId, kind: "district", subtitle: "Район Астаны · учебная модель", zoom: 13 }));

export const DISTRICT_PLACES = Object.fromEntries(ASTANA_DISTRICTS.map((place) => [place.districtId, place])) as Record<DistrictId, MapPlace>;
export const MAP_PLACES = [KAZAKHSTAN, ...CITIES, ...ASTANA_DISTRICTS];
export const MAP_PLACES_BY_ID = Object.fromEntries(MAP_PLACES.map((place) => [place.id, place])) as Record<string, MapPlace>;
