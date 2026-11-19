"use client";

import { useEffect } from "react";
import { useLocale } from "@/components/locale-provider";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLocale();
  useEffect(() => { console.error("Application request failed", error); }, [error]);
  return <main id="main" className="narrow-page"><h1>{t("We couldn't load this page.", "ページを読み込めませんでした。")}</h1><p>{t("The service may be unavailable or still being configured. This message does not confirm a payment or saved changes.", "サービスが利用できないか、設定が未完了の可能性があります。このメッセージは支払いや変更の完了を示すものではありません。")}</p><button className="button dark" onClick={reset}>{t("Try again", "再試行")}</button></main>;
}
