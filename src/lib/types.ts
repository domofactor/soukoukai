export type Circuit = {
  id: string;
  name: string;
  nameJa: string;
  prefecture: string;
  region: string;
  latitude: number;
  longitude: number;
  website: string;
};

export type TrackEvent = {
  id: string;
  title: string;
  organizer: string;
  circuitId: string;
  startsAt: string;
  priceYen: number | null;
  discipline: import("./event-types").Discipline;
  beginner: boolean;
  sourceUrl: string;
  status: "DEMO" | "VERIFIED" | "ORGANIZER" | "DRAFT";
  verifiedAt: string | null;
  descriptionOriginal?: string | null;
  descriptionLanguage?: string | null;
  descriptionTranslation?: string | null;
  translationStatus?: "NONE" | "AUTO" | "EDITED" | "STALE" | "FAILED";
};
