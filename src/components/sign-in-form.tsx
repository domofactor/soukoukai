"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useLocale } from "./locale-provider";
import { localizedPath } from "@/lib/locale";

export function SignInForm() {
  const { locale, t } = useLocale();
  const [accountType, setAccountType] = useState("DRIVER");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await signIn("email", { email, callbackUrl: localizedPath(`/onboarding?type=${accountType}`, locale), redirect: false });
      if (result?.error || !result?.ok) {
        setError(t("We couldn't send your sign-in link. Check your address and try again.", "ログインリンクを送信できませんでした。メールアドレスを確認して再試行してください。"));
      } else {
        window.location.assign(localizedPath("/signin/sent", locale));
      }
    } catch (error) {
      console.error("Sign-in request failed", error);
      setError(t("Sign-in is temporarily unavailable. Please try again.", "ログインは一時的に利用できません。もう一度お試しください。"));
    } finally { setPending(false); }
  }
  return <form className="stack-form" onSubmit={submit}><label>{t("Email address", "メールアドレス")}<input type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label>{t("User type (new accounts)", "ユーザー種別（新規登録の場合）")}<select value={accountType} onChange={(event) => setAccountType(event.target.value)}><option value="DRIVER">{t("Driver", "ドライバー")}</option><option value="SPECTATOR">{t("Spectator", "観客")}</option><option value="ORGANIZER">{t("Event Organizer", "イベント主催者")}</option></select></label>
    <p className="small">{t("Confirm your choice after verifying your email. Existing accounts keep their saved type; this does not change it.", "メール確認後に種別を確定します。既存アカウントの種別は変更されません。")}</p>
    {error && <p className="error-message" role="alert">{error}</p>}<button className="button dark" disabled={pending}>{pending ? t("Sending your link…", "送信中…") : t("Email me a sign-in link", "ログインリンクを送信")}<ArrowUpRight size={16} /></button></form>;
}
