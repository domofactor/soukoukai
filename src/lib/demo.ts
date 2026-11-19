import type { Circuit, TrackEvent } from "./types";
import { disciplines } from "./event-types";

export const demoCircuits: Circuit[] = [
  { id: "tsukuba", name: "Tsukuba Circuit", nameJa: "筑波サーキット", prefecture: "Ibaraki", region: "Kanto", latitude: 36.1517, longitude: 139.9194, website: "https://www.tsukuba-circuit.jp/" },
  { id: "fuji", name: "Fuji Speedway", nameJa: "富士スピードウェイ", prefecture: "Shizuoka", region: "Chubu", latitude: 35.3717, longitude: 138.9275, website: "https://www.fsw.tv/" },
  { id: "nikko", name: "Nikko Circuit", nameJa: "日光サーキット", prefecture: "Tochigi", region: "Kanto", latitude: 36.7061, longitude: 139.8831, website: "https://www.nikko-circuit.jp/" },
  { id: "suzuka", name: "Suzuka Circuit", nameJa: "鈴鹿サーキット", prefecture: "Mie", region: "Kansai", latitude: 34.8431, longitude: 136.5411, website: "https://www.suzukacircuit.jp/" },
  { id: "okayama", name: "Okayama International", nameJa: "岡山国際サーキット", prefecture: "Okayama", region: "Chugoku", latitude: 34.915, longitude: 134.2211, website: "https://www.okayama-international-circuit.jp/" },
  { id: "autopolis", name: "Autopolis", nameJa: "オートポリス", prefecture: "Oita", region: "Kyushu", latitude: 33.0364, longitude: 130.9706, website: "https://autopolis.jp/" },
  { id: "sugo", name: "Sportsland SUGO", nameJa: "スポーツランドSUGO", prefecture: "Miyagi", region: "Tohoku", latitude: 38.1406, longitude: 140.7764, website: "https://www.sportsland-sugo.co.jp/" },
  { id: "tokachi", name: "Tokachi Speedway", nameJa: "十勝スピードウェイ", prefecture: "Hokkaido", region: "Hokkaido", latitude: 42.6317, longitude: 143.2797, website: "https://tokachi.msf.ne.jp/" }
];

export function demoEvents(now = new Date()): TrackEvent[] {
  const titles = ["Open pit lane", "Grassroots drift day", "First laps club", "Weekend track session",
    "Grip practice", "Driver development", "Sunday circuit club", "Open practice"];
  return Array.from({ length: 16 }, (_, index) => {
    const circuit = demoCircuits[index % demoCircuits.length];
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() + 2 + index * 3);
    date.setUTCHours(0, 0, 0, 0);
    return {
      id: `demo-${index}`, title: titles[index % titles.length],
      organizer: "Sample organizer", circuitId: circuit.id, startsAt: date.toISOString(),
      priceYen: [18000, 12000, 22000, 28000][index % 4],
      discipline: index === 0 ? "GRIP" : disciplines[index % disciplines.length],
      beginner: index % 3 !== 1, sourceUrl: circuit.website, status: "DEMO", verifiedAt: null,
      descriptionOriginal: index === 0 ? "Fictional practice day for demonstrating the event explorer. This is not a real booking opportunity." : null,
      descriptionLanguage: index === 0 ? "en" : null,
      descriptionTranslation: index === 0 ? "イベント検索のデモ用の架空の練習会です。実際に申し込めるイベントではありません。" : null,
      translationStatus: index === 0 ? "EDITED" : "NONE"
    };
  });
}
