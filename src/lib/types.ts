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
  discipline: "GRIP" | "DRIFT" | "MIXED";
  beginner: boolean;
  sourceUrl: string;
  status: "DEMO" | "VERIFIED";
  verifiedAt: string | null;
};
