import Link from "next/link";
import { getLocale } from "@/lib/server-locale";
import { translator } from "@/lib/locale";

export default async function Sent() {
  const t = translator(await getLocale());
  return <main id="main" className="narrow-page"><div className="eyebrow">{t("CHECK YOUR INBOX", "受信トレイをご確認ください")}</div><h1>{t("Your sign-in link is on its way.", "ログインリンクを送信しました。")}</h1><p>{t("Open the email to continue. The link works once and expires in 15 minutes. Check spam if it does not arrive.", "メールを開いて続行してください。リンクは一度だけ利用でき、15分で期限切れになります。届かない場合は迷惑メールフォルダーをご確認ください。")}</p><Link className="button outline" href="/signin">{t("Back to sign in", "ログイン画面へ戻る")}</Link></main>;
}
