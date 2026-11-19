import Link from "next/link";
import { authReady } from "@/lib/auth";
import { SignInForm } from "@/components/sign-in-form";
import { getLocale } from "@/lib/server-locale";
import { translator } from "@/lib/locale";

export const dynamic = "force-dynamic";
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, locale] = await Promise.all([searchParams, getLocale()]);
  const t = translator(locale);
  return <main id="main" className="narrow-page"><div className="eyebrow">{t("WELCOME TO YOUR GARAGE", "ログイン・新規登録")}</div><h1>{t("Your next track day starts here.", "次の走行会は、ここから。")}</h1>
    <p>{t("No password to remember. We'll email a secure, single-use sign-in link that expires in 15 minutes.", "パスワードは不要です。15分で期限切れになる、一度だけ利用できる安全なログインリンクをメールで送信します。")}</p>
    {error && <p className="notice" role="alert">{t("Sign-in failed. The link may have expired or been used. Request a new one below.", "ログインできませんでした。リンクの期限切れ、または使用済みの可能性があります。新しいリンクをリクエストしてください。")}</p>}
    {authReady() ? <SignInForm /> : <div className="notice"><strong>{t("Sign-in is not enabled yet.", "ログイン機能は未設定です。")}</strong><p>{t("This preview does not create accounts. PostgreSQL and email must be configured first.", "このプレビューではアカウントは作成されません。データベースとメールの設定が必要です。")}</p><Link href="/">{t("Continue exploring events", "イベント検索を続ける")}</Link></div>}
    <p className="small muted"><Link href="/privacy">{t("Read our privacy notice.", "プライバシーについて")}</Link></p>
  </main>;
}
