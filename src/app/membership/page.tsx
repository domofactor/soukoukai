import Link from "next/link";
import { Check } from "lucide-react";
import { billingReady, stripeClient, priceForPlan, validatePrice } from "@/lib/billing";
import { authReady, currentUser } from "@/lib/auth";
import { startCheckout } from "@/app/actions";
import { formatYen } from "@/lib/format";
import { getLocale } from "@/lib/server-locale";
import { translator } from "@/lib/locale";
import { membershipForAccount, type Membership as Plan } from "@/lib/entitlements";
import { PendingButton } from "@/components/pending-button";

export const dynamic = "force-dynamic";
export default async function Membership({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, locale, user] = await Promise.all([searchParams, getLocale(), currentUser()]);
  const t = translator(locale);
  const plans: Plan[] = ["ATTENDEE", "ORGANIZER"];
  const prices = await Promise.all(plans.map(async (plan) => {
    if (!billingReady(plan) || !authReady()) return null;
    const price = await stripeClient().prices.retrieve(priceForPlan(plan)!);
    validatePrice(price);
    return price;
  }));
  const intervalLabels = {
    day: t("day", "日"), week: t("week", "週"), month: t("month", "か月"), year: t("year", "年")
  };
  return <main id="main" className="membership-page"><div className="eyebrow">{t("MEMBERSHIPS", "会員プラン")}</div><h1>{t("Your next step.", "あなたに合う、次のステップ。")}</h1>
    <p className="page-intro">{t("Public discovery is always free. Driver and Spectator are distinct user types sharing one attendee offering. Organizers have a separate subscription and portal.", "イベントの検索はいつでも無料です。ドライバーと観客は別々のユーザー種別ですが、同じ参加者向けプランを利用します。主催者には専用プランとポータルがあります。")}</p>
    {error && <p className="notice" role="alert">{t("Checkout is unavailable until setup is complete. You have not been charged.", "設定が完了するまで決済は利用できません。請求は発生していません。")}</p>}
    <article className="notice"><strong>{t("Free Explorer", "無料プラン")}</strong><p>{t("Public listings, Japan-only circuit map, calendar, event-type, region, budget and date filters, and direct organizer links.", "イベント一覧・日本国内の地図・カレンダー・種別や地域、予算、日付での絞り込み・主催者へのリンクを利用できます。")}</p><Link className="text-button" href="/#explore">{t("Explore events", "イベントを探す")}</Link></article>
    <div className="plans">{plans.map((plan, index) => {
      const price = prices[index];
      const matches = Boolean(user?.onboarded && membershipForAccount(user.accountType) === plan);
      const features = plan === "ATTENDEE" ? [
        t("For Driver and Spectator user types", "ドライバー・観客向け"),
        t("Up to 20 saved searches", "検索を20件まで保存"),
        t("Optional email alerts for new matching listings", "該当する新規イベントをメールで通知"),
        t("Personal search garage", "マイページで検索を管理")
      ] : [
        t("For Event Organizer user type only", "イベント主催者向け"),
        t("Own-event drafts, editing, publication and withdrawal", "自分のイベントの下書き・編集・公開・公開停止"),
        t("Immediate publishing, labelled organizer-provided", "主催者提供と明記してすぐに公開"),
        t("Automatic EN / JA description translation with editable results", "説明文を英日自動翻訳・翻訳の手動編集")
      ];
      return <article key={plan} className={`plan ${plan === "ORGANIZER" ? "featured" : ""}`}><div className="eyebrow">{plan === "ATTENDEE" ? t("ATTENDEE", "参加者向け") : t("ORGANIZER", "主催者向け")}</div>
        <h2>{plan === "ATTENDEE" ? t("Driver / Spectator Pro", "ドライバー・観客向け Pro") : t("Event Organizer", "イベント主催者")}</h2>
        <div className="plan-price">{price?.unit_amount != null ? formatYen(price.unit_amount) : t("Not configured", "料金未設定")}{price?.recurring && <span>/ {price.recurring.interval_count} {intervalLabels[price.recurring.interval]}</span>}</div>
        <ul>{features.map((feature) => <li key={feature}><Check size={17} />{feature}</li>)}</ul>
        {!price ? <><button className="button dark" disabled>{t("Not yet available", "現在利用できません")}</button><p className="small">{t("Pricing appears after billing is configured. No charges or subscriptions are simulated in demo mode.", "決済の設定後に料金を表示します。デモでは課金や会員登録は行いません。")}</p></> :
          matches ? <form action={startCheckout}><PendingButton>{t("Continue to Stripe", "Stripe 決済へ進む")}</PendingButton></form> :
            <Link className="button outline" href={!user ? "/signin" : !user.onboarded ? "/onboarding" : "/account"}>{!user ? t("Sign in & choose your user type", "ログインしてユーザー種別を選択") : !user.onboarded ? t("Choose your user type", "ユーザー種別を選択") : t("For a different account category", "別のアカウント種別向け")}</Link>}
      </article>;
    })}</div>
    <div className="membership-fineprint"><h3>{t("Before subscribing", "会員登録の前に")}</h3>
      <p>{t("Subscriptions are not event tickets. Confirm the amount, recurring interval and tax in Stripe before paying. Driver / Spectator Pro does not grant organizer access; Organizer membership does not include attendee saved searches. Account category changes require operator assistance, never a client-side price switch.", "会員登録はイベントのチケット購入ではありません。決済前にStripeで料金・請求間隔・税額をご確認ください。参加者向け Pro では主催者機能は利用できず、主催者プランには参加者向け検索保存は含まれません。アカウント種別の変更には運営者の対応が必要です。")}</p>
      <p>{t("Cancel renewal in Stripe; active access lasts to the paid period end. After expiry, organizers can still view, withdraw and delete their own events, but cannot create, edit, translate or publish. Already published events remain visible until withdrawn or past their start time.", "Stripeで自動更新を停止できます。有効な会員資格は支払い済み期間の終了まで続きます。期限後も主催者は自分のイベントの閲覧・公開停止・削除ができますが、作成・編集・翻訳・公開はできません。公開済みイベントは、公開停止または開始時刻まで表示されます。")}</p>
      <p>{t("Alerts include newly published organizer-provided listings as well as operator-verified listings, with clear provenance. They do not guarantee availability or notify every schedule edit.", "通知には、確認済みイベントと主催者提供イベントの両方を区別して含めます。空き状況の保証や、すべての変更の通知ではありません。")}</p>
    </div>
  </main>;
}
