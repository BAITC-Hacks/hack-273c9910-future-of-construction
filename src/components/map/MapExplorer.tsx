"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Bookmark, BookmarkCheck, Check, ChevronRight, Compass, Globe2, Layers3, LocateFixed, MapPin, Minus, Plus, Search, Trash2, X } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ASTANA_DISTRICTS, KAZAKHSTAN, MAP_PLACES, MAP_PLACES_BY_ID, type MapPlace } from "@/data/mapPlaces";
import { DISTRICTS_BY_ID } from "@/data/districts";
import { MAP_STORAGE_KEY, MAX_NOTE_LENGTH, mapUrl, parseMapWorkspace, searchMapPlaces, workspaceToGeoJSON, type MapLayer, type MapWorkspace } from "@/lib/mapWorkspace";
import { YandexMap } from "./YandexMap";

const layers: { id: MapLayer; label: string }[] = [{ id: "map", label: "Схема" }, { id: "satellite", label: "Спутник" }, { id: "traffic", label: "Пробки" }];

export function MapExplorer() {
  const [selected, setSelected] = useState<MapPlace>(KAZAKHSTAN);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "saved">("all");
  const [filter, setFilter] = useState<"all" | "district">("all");
  const [layer, setLayer] = useState<MapLayer>("map");
  const [zoom, setZoom] = useState(KAZAKHSTAN.zoom);
  const [refreshKey, setRefreshKey] = useState(0);
  const [workspace, setWorkspace] = useState<MapWorkspace>({ version: 1, places: [] });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    try {
      setWorkspace(parseMapWorkspace(window.localStorage.getItem(MAP_STORAGE_KEY)));
    } catch {
      setStorageBlocked(true);
      setFeedback({ text: "Не удалось прочитать сохранённые места. Разрешите хранение данных в браузере или начните новый список.", error: true });
    }
    setReady(true);
  }, []);

  const saved = workspace.places.find((place) => place.placeId === selected.id);
  const note = drafts[selected.id] ?? saved?.note ?? "";
  const noteChanged = note !== (saved?.note ?? "");
  const savedIds = useMemo(() => new Set(workspace.places.map((place) => place.placeId)), [workspace]);
  const shown = useMemo(() => searchMapPlaces(
    tab === "saved" ? workspace.places.map((place) => MAP_PLACES_BY_ID[place.placeId]) : filter === "district" ? ASTANA_DISTRICTS : MAP_PLACES,
    query,
  ), [tab, workspace, filter, query]);
  const district = selected.districtId ? DISTRICTS_BY_ID[selected.districtId] : null;

  function selectPlace(place: MapPlace) {
    setSelected(place);
    setZoom(place.zoom);
    setRefreshKey((value) => value + 1);
    if (!storageBlocked) setFeedback(null);
  }

  function persist(next: MapWorkspace, success: string) {
    try {
      window.localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(next));
      setWorkspace(next);
      setStorageBlocked(false);
      setFeedback({ text: success });
      return true;
    } catch {
      setFeedback({ text: "Не удалось сохранить. Проверьте, что браузер разрешает хранение данных для этого сайта, и попробуйте ещё раз.", error: true });
      return false;
    }
  }

  function savePlace(withNote = false) {
    if (!ready || storageBlocked) return;
    const item = { placeId: selected.id, note: withNote ? note.trim() : saved?.note ?? "", updatedAt: new Date().toISOString() };
    const next = { version: 1 as const, places: saved ? workspace.places.map((place) => place.placeId === selected.id ? item : place) : [...workspace.places, item] };
    if (persist(next, withNote ? "Заметка и место сохранены в этом браузере." : "Место добавлено в ваш список." ) && withNote) {
      setDrafts((previous) => ({ ...previous, [selected.id]: item.note }));
    }
  }

  function removePlace(place: MapPlace) {
    persist({ version: 1, places: workspace.places.filter((item) => item.placeId !== place.id) }, `«${place.name}» удалено из сохранённых мест.`);
  }

  function exportPlaces() {
    const blob = new Blob([JSON.stringify(workspaceToGeoJSON(workspace), null, 2)], { type: "application/geo+json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "akim-kazakhstan.geojson";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback({ text: "Файл GeoJSON подготовлен: сохранённые точки и заметки." });
  }

  return <div className="map-page"><SiteHeader /><main id="main-content" className="site-container map-main">
    <div className="map-page-heading"><div><div className="map-eyebrow"><span /> ТЕРРИТОРИЯ ВОЗМОЖНОСТЕЙ</div><h1>Большие идеи.<br className="map-mobile-break" /> <span>На карте.</span></h1><p>Исследуйте города Казахстана, отмечайте важное и находите место для следующего проекта.</p></div><button type="button" className="map-export" onClick={exportPlaces} disabled={!ready || !workspace.places.length}><ArrowDownToLine size={17} /> Экспорт мест <span>GeoJSON</span></button></div>

    {feedback && <div className={`map-feedback ${feedback.error ? "is-error" : ""}`} role={feedback.error ? "alert" : "status"}>{!feedback.error && <Check size={17} />}<span>{feedback.text}</span>{storageBlocked && <button type="button" onClick={() => persist({ version: 1, places: [] }, "Новый список готов. Места будут сохраняться в этом браузере.")}>Начать новый список</button>}{!storageBlocked && <button type="button" aria-label="Закрыть уведомление" onClick={() => setFeedback(null)}><X size={16} /></button>}</div>}

    <div className="map-workspace">
      <aside className="map-sidebar" aria-label="Поиск мест">
        <div className="map-sidebar-top"><div className="map-sidebar-title"><Compass size={20} /><h2>Откройте Казахстан</h2></div><label className="map-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Город или район…" aria-label="Поиск по списку городов и районов" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Очистить поиск"><X size={15} /></button>}</label><div className="map-list-tabs" role="group" aria-label="Список мест"><button type="button" aria-pressed={tab === "all"} onClick={() => setTab("all")}>Все места</button><button type="button" aria-pressed={tab === "saved"} onClick={() => setTab("saved")}><Bookmark size={14} /> Сохранённые <span>{workspace.places.length}</span></button></div></div>
        {tab === "all" && <div className="map-list-filters" role="group" aria-label="Тип места"><button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Вся страна</button><button type="button" aria-pressed={filter === "district"} onClick={() => setFilter("district")}>Районы Астаны</button></div>}
        <div className={`map-place-list ${tab === "saved" ? "map-saved-list" : ""}`} aria-label={tab === "saved" ? "Сохранённые места" : "Города и районы"}>
          {tab === "saved" && !ready ? <p className="map-empty">Загружаем сохранённые места…</p> : !shown.length ? <div className="map-empty"><span>{tab === "saved" && !query ? <Bookmark size={25} /> : <Search size={25} />}</span><strong>{tab === "saved" && !query ? "Ваши будущие проекты — здесь" : "Место не найдено"}</strong><p>{tab === "saved" && !query ? "Выберите город или район и нажмите «Сохранить место»." : "Попробуйте другое название. Поиск работает по 12 городам и 5 районам модели Астаны."}</p><button type="button" onClick={() => { setQuery(""); setTab("all"); setFilter("all"); }}>Показать все места <ArrowRight size={15} /></button></div> : shown.map((place) => <div key={place.id} className={`map-place-row ${selected.id === place.id ? "is-selected" : ""}`}><button type="button" className="map-place-button" onClick={() => selectPlace(place)} aria-pressed={selected.id === place.id}><span className="map-place-icon">{place.kind === "country" ? <Globe2 size={19} /> : <MapPin size={18} />}</span><span className="map-place-text"><strong>{place.name}</strong><small>{place.kind === "district" ? "Район Астаны" : place.kind === "country" ? "Обзор страны" : "Город · Казахстан"}</small></span>{savedIds.has(place.id) ? <BookmarkCheck size={15} className="map-saved-icon" /> : <ChevronRight size={15} className="map-place-chevron" />}</button>{tab === "saved" && <button type="button" className="map-remove" onClick={() => removePlace(place)} aria-label={`Удалить ${place.name}${place.kind === "district" ? ", район Астаны," : ""} из сохранённых`}><Trash2 size={15} /></button>}</div>)}
        </div>
        <div className="map-sidebar-bottom"><span className="map-small-dot" /><p>Ваш список хранится<br /><strong>только в этом браузере</strong></p><Bookmark size={18} /></div>
      </aside>

      <section className="map-canvas-card" aria-label="Интерактивная карта">
        <div className="map-canvas-toolbar"><div className="map-location-label"><MapPin size={17} /><span>{selected.name}{selected.kind === "district" && <small> · Астана</small>}</span></div><div className="map-layer-control" role="group" aria-label="Слои карты">{layers.map((item) => <button type="button" key={item.id} aria-pressed={layer === item.id} onClick={() => setLayer(item.id)}>{item.id === "map" && <Layers3 size={14} />}{item.label}</button>)}</div></div>
        <div className="map-canvas"><YandexMap place={selected} layer={layer} zoom={zoom} refreshKey={refreshKey} /></div>
        <div className="map-canvas-bottom"><div className="map-view-controls"><button type="button" onClick={() => setZoom((value) => Math.max(3, value - 1))} disabled={zoom <= 3} aria-label="Уменьшить масштаб карты"><Minus size={18} /></button><span aria-live="polite">{zoom}×</span><button type="button" onClick={() => setZoom((value) => Math.min(18, value + 1))} disabled={zoom >= 18} aria-label="Увеличить масштаб карты"><Plus size={18} /></button><span className="map-control-divider" /><button type="button" className="map-recenter" onClick={() => { setZoom(selected.zoom); setRefreshKey((value) => value + 1); }}><LocateFixed size={17} /><span>К выбранному месту</span></button></div><a href={mapUrl(selected, layer, zoom, false)} target="_blank" rel="noopener noreferrer">В Яндекс Картах <ArrowUpRight size={15} /></a></div>
        <p className="map-provider-note">{layer === "traffic" ? "Пробки отображаются Яндексом там, где доступны данные. " : "Карту можно перемещать и масштабировать. "}Для загрузки нужен интернет. <a href={mapUrl(selected, layer, zoom, false)} target="_blank" rel="noopener noreferrer">Не загрузилась? Открыть отдельно.</a></p>
      </section>
    </div>

    <div className="map-detail-grid">
      <section className="map-detail-card"><div className="map-section-label"><MapPin size={15} /> В ФОКУСЕ</div><div className="map-selected-heading"><div><h2>{selected.name}</h2><p>{selected.subtitle}</p></div><button type="button" className={`map-save ${saved ? "is-saved" : ""}`} disabled={!ready || storageBlocked} onClick={() => saved ? removePlace(selected) : savePlace()}>{saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}{saved ? "Сохранено" : "Сохранить место"}</button></div>
        {district ? <><p className="map-district-profile">{district.profile}</p><div className="map-model-values">{[{ label: "Транспорт", value: Math.round((district.indicators.T1 + district.indicators.T2) / 2) }, { label: "Экология", value: Math.round((district.indicators.E1 + district.indicators.E2) / 2) }, { label: "Социальная среда", value: Math.round((district.indicators.S1 + district.indicators.S2) / 2) }].map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}<small>/100</small></strong><div className="map-model-track"><i style={{ width: `${item.value}%` }} /></div></div>)}</div><div className="map-model-bottom"><p>Учебная модель · исходные индексы, не данные наблюдений. Точка обозначает ориентир, а не границы района.</p><Link href={`/simulator?district=${selected.districtId}`}>Работать с районом <ArrowRight size={17} /></Link></div></> : <><p className="map-location-copy">{selected.kind === "country" ? "Начните с города. Посмотрите улицы, окружение и транспорт, сохраните интересные места и соберите свои идеи в одном списке." : "Изучите улицы и окружение на карте. Сохраните город, добавьте идею или наблюдение — к ним можно вернуться позже."}</p><div className="map-next-step"><span className="map-next-step-icon"><Compass size={22} /></span><div><strong>От карты — к решениям</strong><p>Для пяти районов Астаны доступен симулятор городских изменений.</p></div><button type="button" onClick={() => { setTab("all"); setFilter("district"); setQuery(""); selectPlace(ASTANA_DISTRICTS[0]); window.document.querySelector(".map-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} aria-label="Выбрать район Астаны"><ArrowUpRight size={20} /></button></div></>}
      </section>

      <section className="map-notes-card"><div className="map-notes-heading"><div className="map-section-label"><Bookmark size={15} /> ВАШИ ЗАМЕТКИ</div><span>{noteChanged ? "Есть изменения" : saved ? "Сохранено локально" : "Только для вас"}</span></div><label htmlFor="map-place-note">Идея для {selected.kind === "country" ? "Казахстана" : `места «${selected.name}»`}</label><textarea id="map-place-note" value={note} maxLength={MAX_NOTE_LENGTH} onChange={(event) => setDrafts((previous) => ({ ...previous, [selected.id]: event.target.value }))} placeholder="Что хочется улучшить? Что важно изучить? Запишите свои наблюдения…" /><div className="map-notes-bottom"><span>{note.length} / {MAX_NOTE_LENGTH}</span><button type="button" onClick={() => savePlace(true)} disabled={!ready || storageBlocked || (!noteChanged && Boolean(saved))}><Check size={16} /> Сохранить заметку</button></div><p>Заметка привязана к выбранному месту. При сохранении место добавится в ваш список.</p></section>
    </div>
  </main><SiteFooter /></div>;
}
