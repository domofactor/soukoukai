"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { GeoJsonObject } from "geojson";
import type { Circuit, TrackEvent } from "@/lib/types";
import japan from "@/data/japan.json";
import { useLocale } from "./locale-provider";
import "leaflet/dist/leaflet.css";

export default function CircuitMap({ circuits, events, selected, onSelect }: {
  circuits: Circuit[]; events: TrackEvent[]; selected: string; onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const [tileError, setTileError] = useState(false);
  const { locale, t } = useLocale();
  useEffect(() => {
    let disposed = false;
    import("leaflet").then((L) => {
      if (disposed || !container.current) return;
      const bounds = L.latLngBounds([20, 122], [46.5, 154.5]);
      const instance = L.map(container.current, {
        scrollWheelZoom: false, maxBounds: bounds, maxBoundsViscosity: 1,
        minZoom: 3, maxZoom: 12
      }).setView([35, 138], 4);
      map.current = instance;
      L.geoJSON(japan as GeoJsonObject, {
        style: { color: "#79906a", weight: 1, fillColor: "#cfdcc0", fillOpacity: 1 },
        attribution: '<a href="https://www.naturalearthdata.com/about/terms-of-use/">Made with Natural Earth (public domain)</a>'
      }).addTo(instance);
      L.control.scale({ imperial: false }).addTo(instance);
      const japanButton = L.Control.extend({
        onAdd() {
          const button = L.DomUtil.create("button", "button outline map-reset");
          button.textContent = t("All Japan", "日本全体");
          button.type = "button";
          L.DomEvent.disableClickPropagation(button);
          L.DomEvent.on(button, "click", () => instance.fitBounds(bounds));
          return button;
        }
      });
      new japanButton({ position: "topright" }).addTo(instance);
      const visible: [number, number][] = [];
      circuits.forEach((circuit) => {
        const count = events.filter((event) => event.circuitId === circuit.id).length;
        if (!count) return;
        const point: [number, number] = [circuit.latitude, circuit.longitude];
        visible.push(point);
        const icon = L.divIcon({
          className: "circuit-pin-container",
          html: `<span class="circuit-pin${selected === circuit.id ? " is-selected" : ""}"><span>${count}</span></span>`,
          iconSize: [34, 34], iconAnchor: [17, 34]
        });
        const popup = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = locale === "ja" ? circuit.nameJa : circuit.name;
        const description = document.createElement("p");
        description.textContent = `${circuit.prefecture} · ${count} ${t("matching events", "件のイベント")}`;
        const button = document.createElement("button");
        button.textContent = t("Show events here", "このイベントを表示");
        button.className = "map-popup-button";
        button.onclick = () => onSelect(circuit.id);
        popup.append(name, description, button);
        const label = `${locale === "ja" ? circuit.nameJa : circuit.name}: ${count} ${t("matching events", "件のイベント")}`;
        const marker = L.marker(point, { icon, title: label }).addTo(instance).bindPopup(popup);
        marker.getElement()?.setAttribute("aria-label", label);
      });
      if (visible.length) instance.fitBounds(visible, { padding: [55, 55], maxZoom: 10 });
      else instance.fitBounds(bounds);
      const observer = new ResizeObserver(() => instance.invalidateSize());
      observer.observe(container.current);
      instance.once("unload", () => observer.disconnect());
    }).catch((error: unknown) => {
      console.error("Map failed to initialize", error);
      if (!disposed) setTileError(true);
    });
    return () => { disposed = true; map.current?.remove(); map.current = null; };
  }, [circuits, events, selected, onSelect, locale, t]);
  return <><div ref={container} className="circuit-map" role="region" aria-label={t("Japan-only map of circuits with matching events", "日本国内のサーキットと該当イベントの地図")} />{tileError && <p className="map-error" role="status">{t("The map is unavailable. Use the event list, calendar or circuit filter.", "地図を表示できません。一覧・カレンダー・サーキット検索をご利用ください。")}</p>}</>;
}
