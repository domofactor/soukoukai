"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { Circuit, TrackEvent } from "@/lib/types";
import "leaflet/dist/leaflet.css";

export default function CircuitMap({ circuits, events, selected, onSelect }: {
  circuits: Circuit[]; events: TrackEvent[]; selected: string; onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    let disposed = false;
    import("leaflet").then((L) => {
      if (disposed || !container.current) return;
      const instance = L.map(container.current, { scrollWheelZoom: false }).setView([36.5, 137.5], 5);
      map.current = instance;
      const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
      }).addTo(instance);
      tiles.on("tileerror", () => { if (!disposed) setTileError(true); });
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
        name.textContent = circuit.name;
        const description = document.createElement("p");
        description.textContent = `${circuit.prefecture} · ${count} matching event${count === 1 ? "" : "s"}`;
        const button = document.createElement("button");
        button.textContent = "Show events here";
        button.className = "map-popup-button";
        button.onclick = () => onSelect(circuit.id);
        popup.append(name, description, button);
        const label = `${circuit.name}: ${count} matching event${count === 1 ? "" : "s"}`;
        const marker = L.marker(point, { icon, title: label }).addTo(instance).bindPopup(popup);
        marker.getElement()?.setAttribute("aria-label", label);
      });
      if (visible.length) instance.fitBounds(visible, { padding: [55, 55], maxZoom: 10 });
      const observer = new ResizeObserver(() => instance.invalidateSize());
      observer.observe(container.current);
      instance.once("unload", () => observer.disconnect());
    }).catch((error: unknown) => {
      console.error("Map failed to initialize", error);
      if (!disposed) setTileError(true);
    });
    return () => { disposed = true; map.current?.remove(); map.current = null; };
  }, [circuits, events, selected, onSelect]);
  return <><div ref={container} className="circuit-map" role="region" aria-label="Map of Japanese circuits with matching events" />{tileError && <p className="map-error" role="status">Map tiles are unavailable. All matching circuits remain accessible through the event list and circuit filter.</p>}</>;
}
