import Link from "next/link";
import { getLocale } from "@/lib/server-locale";
import { translator } from "@/lib/locale";

export default async function NotFound() {
  const t = translator(await getLocale());
  return <main id="main" className="narrow-page"><h1>{t("That page isn't here.", "ページが見つかりません。")}</h1><Link className="button dark" href="/">{t("Back to events", "イベント一覧へ戻る")}</Link></main>;
}
