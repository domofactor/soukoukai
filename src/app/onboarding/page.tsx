import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getLocale } from "@/lib/server-locale";
import { translator } from "@/lib/locale";
import { completeOnboarding } from "@/app/actions";
import { PendingButton } from "@/components/pending-button";
import { db } from "@/lib/db";

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ type?: string; error?: string }> }) {
  const [user, locale, params] = await Promise.all([currentUser(), getLocale(), searchParams]);
  const t = translator(locale);
  if (!user) redirect("/signin");
  if (user.onboarded) redirect("/account");
  const billing = await db.billing.findUnique({ where: { userId: user.id } });
  return <main id="main" className="narrow-page"><h1>{t("Welcome to Soukoukai.", "Soukoukai へようこそ。")}</h1>
    <p>{t("Choose Driver, Spectator, or Event Organizer. Drivers and spectators share the attendee membership; organizers have a separate subscription. This choice is saved once. Contact the operator for later changes.", "ドライバー・観客・イベント主催者から選択してください。ドライバーと観客は同じ参加者向け会員プランを利用し、主催者は別の会員プランです。選択は一度だけ保存されます。後からの変更は運営者にご連絡ください。")}</p>
    {billing && <p className="notice">{t("Your existing attendee subscription and saved searches are preserved. Select Driver or Spectator; organizer conversion requires operator assistance.", "既存の参加者向け会員登録と保存済み検索は保持されます。ドライバーまたは観客を選択してください。主催者への変更には運営者の対応が必要です。")}</p>}
    {params.error && <p role="alert" className="notice">{t("Select an account category.", "アカウントの種類を選んでください。")}</p>}
    <form action={completeOnboarding} className="stack-form"><label>{t("Account category", "アカウントの種類")}
      <select name="accountType" required defaultValue={["DRIVER", "SPECTATOR", "ORGANIZER"].includes(params.type ?? "") && !(billing && params.type === "ORGANIZER") ? params.type : ""}>
        <option value="" disabled>{t("Select your user type", "ユーザー種別を選択")}</option>
        <option value="DRIVER">{t("Driver", "ドライバー")}</option><option value="SPECTATOR">{t("Spectator", "観客")}</option><option value="ORGANIZER" disabled={Boolean(billing)}>{t("Event Organizer", "イベント主催者")}</option>
      </select></label><PendingButton>{t("Save and continue", "保存して進む")}</PendingButton></form>
  </main>;
}
