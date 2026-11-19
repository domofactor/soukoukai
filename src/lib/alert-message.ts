import { translator, type Locale, localizedPath } from "./locale";
import { japanDate } from "./search";
import { disciplineLabels } from "./event-types";
import { eventDescription } from "./event-visibility";
import type { Circuit, TrackEvent } from "./types";

export function alertMessage(event: TrackEvent, circuit: Circuit, name: string, locale: Locale, url: (path: string) => string) {
  const t = translator(locale);
  const description = eventDescription(event, locale);
  return {
    subject: `${t("New event listing", "新しいイベント")}: ${event.title}`,
    text: [
      `${t("A new listing matches", "保存済み検索に新着イベント：")} "${name}"`, "", event.title,
      `${locale === "ja" ? circuit.nameJa : circuit.name} · ${circuit.prefecture}`, `${japanDate(event.startsAt)} JST`,
      disciplineLabels[event.discipline][locale],
      event.status === "ORGANIZER" ? t("Organizer-provided · not independently verified", "主催者提供・独立検証なし") : t("Verified by the operator", "運営者確認済み"),
      `${t("Organizer", "主催者")}: ${event.organizer}`,
      event.priceYen === null ? t("Entry fee: check with organizer", "参加費は主催者にご確認ください") : `${t("Listed entry fee", "掲載参加費")}: JPY ${event.priceYen}`,
      ...(description.text ? ["", description.translated ? description.automatic ? t("Machine-translated description:", "自動翻訳の説明：") : t("Organizer-edited translation:", "主催者編集済みの翻訳：") : t("Original description:", "原文の説明："), description.text] : []),
      "", t("Review details before booking:", "申込前に詳細をご確認ください："), url(localizedPath(`/?circuit=${circuit.id}#explore`, locale)),
      "", t("Delete the saved search to stop alerts:", "通知を停止するには、保存済み検索を削除してください："), url(localizedPath("/account", locale)),
      "", t("Soukoukai does not sell event tickets. Always confirm details with the organizer.", "Soukoukaiはイベントのチケットを販売していません。詳細は必ず主催者にご確認ください。")
    ].join("\n")
  };
}
