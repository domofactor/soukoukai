import { z } from "zod";
import type { Circuit, TrackEvent } from "./types";
import { disciplines } from "./event-types";
import { regionLabel } from "./locale";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value,
  "Enter a valid date"
);
export const filterSchema = z.object({
  query: z.string().trim().max(100).default(""),
  circuit: z.string().max(80).default(""),
  region: z.string().max(80).default(""),
  discipline: z.union([z.literal(""), z.enum(disciplines)]).default(""),
  from: z.union([z.literal(""), date]).default(""),
  to: z.union([z.literal(""), date]).default(""),
  beginner: z.boolean().default(false),
  maxPrice: z.number().int().min(0).max(1000000).nullable().default(null),
  near: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radiusKm: z.number().min(1).max(2000)
  }).nullable().default(null)
}).strict().refine((value) => !value.from || !value.to || value.from <= value.to, {
  message: "End date must be on or after start date", path: ["to"]
});
export type Filters = z.infer<typeof filterSchema>;
export const emptyFilters: Filters = filterSchema.parse({});

export function japanDate(date: Date | string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date(date));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (value: number) => value * Math.PI / 180;
  const a = Math.sin(radians(lat2 - lat1) / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) *
    Math.sin(radians(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - Math.min(1, a)));
}

export function filterEvents(events: TrackEvent[], circuits: Circuit[], filters: Filters) {
  const circuitById = new Map(circuits.map((circuit) => [circuit.id, circuit]));
  const query = filters.query.toLocaleLowerCase();
  return events.filter((event) => {
    const circuit = circuitById.get(event.circuitId);
    if (!circuit) return false;
    const day = japanDate(event.startsAt);
    if (filters.circuit && event.circuitId !== filters.circuit) return false;
    if (filters.region && circuit.region !== filters.region) return false;
    if (filters.discipline && event.discipline !== filters.discipline) return false;
    if (filters.from && day < filters.from) return false;
    if (filters.to && day > filters.to) return false;
    if (filters.beginner && !event.beginner) return false;
    if (filters.maxPrice !== null && (event.priceYen === null || event.priceYen > filters.maxPrice)) return false;
    if (filters.near && distanceKm(filters.near.latitude, filters.near.longitude,
      circuit.latitude, circuit.longitude) > filters.near.radiusKm) return false;
    return !query || [event.title, event.organizer, circuit.name, circuit.nameJa,
      circuit.prefecture, circuit.region, regionLabel(circuit.region, "ja"),
      event.descriptionOriginal, event.translationStatus === "AUTO" || event.translationStatus === "EDITED" ? event.descriptionTranslation : ""]
      .join(" ").toLocaleLowerCase().includes(query);
  }).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function filtersFromParams(params: URLSearchParams): Filters {
  return filterSchema.parse({
    query: params.get("q") || "",
    circuit: params.get("circuit") || "",
    region: params.get("region") || "",
    discipline: params.get("discipline") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
    beginner: params.get("beginner") === "true",
    maxPrice: params.has("maxPrice") ? Number(params.get("maxPrice")) : null
  });
}

export function searchUrl(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  for (const key of ["circuit", "region", "discipline", "from", "to"] as const) {
    if (filters[key]) params.set(key, filters[key]);
  }
  if (filters.beginner) params.set("beginner", "true");
  if (filters.maxPrice !== null) params.set("maxPrice", String(filters.maxPrice));
  // Precise browser coordinates are intentionally not persisted in URLs or saved searches.
  return `/${params.size ? `?${params}` : ""}#explore`;
}
