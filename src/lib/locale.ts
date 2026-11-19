export type Locale = "en" | "ja";
export function normalizeLocale(value: unknown): Locale { return value === "ja" ? "ja" : "en"; }
const english: (en: string, ja: string) => string = (en) => en;
const japanese = (_en: string, ja: string) => ja;
export function translator(locale: Locale) { return locale === "ja" ? japanese : english; }
const regions: Record<string, string> = {
  Hokkaido: "北海道", Tohoku: "東北", Kanto: "関東", Chubu: "中部",
  Kansai: "関西", Chugoku: "中国", Shikoku: "四国", Kyushu: "九州", Okinawa: "沖縄"
};
export function regionLabel(region: string, locale: Locale) {
  return locale === "ja" ? regions[region] ?? region : region;
}
export function localizedPath(path: string, locale: Locale) {
  const url = new URL(path, "https://local.invalid");
  url.searchParams.set("lang", locale);
  return `${url.pathname}${url.search}${url.hash}`;
}
