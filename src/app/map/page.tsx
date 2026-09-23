import type { Metadata } from "next";
import { MapExplorer } from "@/components/map/MapExplorer";
import "@/components/map/map.css";

export const metadata: Metadata = {
  title: "Карта Казахстана — Аким",
  description: "Исследуйте Казахстан на Яндекс Картах, сохраняйте места и заметки, планируйте изменения в районах Астаны.",
};

export default function MapPage() {
  return <MapExplorer />;
}
