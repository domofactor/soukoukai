import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, ArrowUpRight, Trash2 } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasMembership, membershipForAccount } from "@/lib/entitlements";
import { filterSchema, searchUrl } from "@/lib/search";
import { deleteSearch, openBillingPortal } from "@/app/actions";
import { SignOut } from "@/components/sign-out";
import { getLocale } from "@/lib/server-locale";
import { translator } from "@/lib/locale";
import { PendingButton } from "@/components/pending-button";

export const dynamic = "force-dynamic";
export default async function Account({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const [user, { notice }, locale] = await Promise.all([currentUser(), searchParams, getLocale()]);
  const t = translator(locale);
  if (!user) return <main id="main" className="narrow-page"><h1>{t("Your garage.", "マイページ")}</h1><p>{t("Sign in to choose your user type, manage your membership and plan your next event.", "ログインしてユーザー種別を選び、会員プランや予定を管理しましょう。")}</p><Link className="button dark" href="/signin">{t("Sign in", "ログイン")}<ArrowUpRight size={16} /></Link></main>;
  if (!user.onboarded) redirect("/onboarding");
  const [billing, searches] = await Promise.all([
    db.billing.findUnique({ where: { userId: user.id } }),
    db.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } })
  ]);
  const organizer = user.accountType === "ORGANIZER";
  const active = hasMembership(billing, membershipForAccount(user.accountType));
  const pro = !organizer && active;
  const category = organizer ? t("Event Organizer", "イベント主催者") : user.accountType === "SPECTATOR" ? t("Spectator", "観客") : t("Driver", "ドライバー");
  const statusLabels: Record<string, string> = {
    active: t("Active", "有効"), trialing: t("Trial", "試用中"), inactive: t("Inactive", "未登録"), past_due: t("Payment overdue", "支払い遅延"),
    canceled: t("Canceled", "解約済み"), unpaid: t("Unpaid", "未払い"), incomplete: t("Incomplete", "手続き未完了"),
    incomplete_expired: t("Expired", "期限切れ"), paused: t("Paused", "一時停止")
  };
  return <main id="main" className="account-page"><div className="section-heading"><div><div className="eyebrow">{t("WELCOME BACK", "おかえりなさい")}</div><h1>{t("Your garage.", "マイページ")}</h1><p className="muted">{user.email} · {category}</p></div><SignOut /></div>
    {notice === "checkout" && <p className="notice" role="status">{t("Checkout returned. Access activates only after Stripe confirms your subscription. Refresh shortly if pending.", "決済画面から戻りました。Stripeによる確認後に会員機能が有効になります。処理中の場合は少し待って再読み込みしてください。")}</p>}
    {notice === "existing" && <p className="notice" role="status">{t("An existing subscription was found. Use Manage billing rather than purchasing another.", "既存の会員登録が見つかりました。重複購入せず「決済の管理」をご利用ください。")}</p>}
    {notice === "role" && <p className="notice" role="alert">{t("The organizer portal is only available to Event Organizer accounts.", "主催者ポータルはイベント主催者アカウント専用です。")}</p>}
    <section className="account-membership"><div><span className="tiny-pro">{organizer ? t("ORGANIZER", "主催者") : t("ATTENDEE", "参加者")}</span><h2>{active ? t("Your membership is active.", "会員登録は有効です。") : t("Explore your membership.", "会員プランを確認しましょう。")}</h2>
      <p>{active ? `${t("Current access until", "利用期限：")} ${billing!.currentPeriodEnd!.toLocaleDateString(locale, { timeZone: "Asia/Tokyo", dateStyle: "long" })} JST` : organizer ? t("Subscribe to create, edit and publish events.", "会員登録するとイベントを作成・編集・公開できます。") : t("Subscribe to save searches and receive matching-event emails.", "会員登録すると検索保存とメール通知を利用できます。")}</p>
      {billing && <p className="small">{t("Billing status:", "決済状況：")} {statusLabels[billing.status] ?? t("Unknown — contact the operator", "不明・運営者にお問い合わせください")}</p>}</div>
      <div className="portal-controls">{billing && <form action={openBillingPortal}><PendingButton className="button outline">{t("Manage billing", "決済の管理")}</PendingButton></form>}{!active && <Link className="button dark" href="/membership">{t("View memberships", "会員プランを見る")}</Link>}</div>
    </section>
    {organizer ? <section className="notice"><h2>{t("Your organizer portal", "主催者ポータル")}</h2><p>{t("Manage your own listings. Withdrawal and deletion remain available after subscription expiry.", "自分のイベントを管理できます。会員期限後も公開停止と削除は利用できます。")}</p><Link href="/organizer" className="button dark">{t("Manage events", "イベントを管理")}</Link></section> : <>
      <div className="section-heading"><h2>{t("Saved searches", "保存済み検索")} <span className="muted small">{searches.length} / 20</span></h2><Link className="text-button" href="/#explore">{t("Find events", "イベントを探す")}<ArrowUpRight size={15} /></Link></div>
      {!pro && searches.length > 0 && <p className="notice">{t("Your searches are retained. Opening them and sending alerts is paused until your attendee Pro membership is active. You may delete them at any time.", "検索は保持されています。参加者向け Pro が有効になるまで検索の表示と通知は停止します。削除はいつでも可能です。")}</p>}
      <div className="saved-search-list">{searches.length ? searches.map((search) => {
        const filters = filterSchema.safeParse(search.filters);
        return <article className="saved-search" key={search.id}><Bookmark size={21} /><div><h3>{search.name}</h3><p>{search.alerts ? pro ? t("Email alerts enabled", "メール通知：有効") : t("Email alerts paused", "メール通知：一時停止") : t("Email alerts off", "メール通知：無効")} · {search.locale === "ja" ? "日本語" : "English"}</p>{!filters.success && <p role="alert">{t("Recreate this search because its filters are no longer valid.", "検索条件が無効なため、検索を作り直してください。")}</p>}</div>{pro && filters.success && <Link className="button outline" href={searchUrl(filters.data)}>{t("Open search", "検索を開く")}</Link>}<form action={deleteSearch}><input type="hidden" name="id" value={search.id} /><button className="icon-button" aria-label={`${t("Delete", "削除：")} ${search.name}`}><Trash2 size={17} /></button></form></article>;
      }) : <div className="empty-state"><Bookmark size={25} /><h3>{t("Your favorite searches go here.", "お気に入りの検索をここに。")}</h3><p>{t("Set filters in the explorer and choose Save search.", "条件を設定して「検索を保存」を選んでください。")}</p><Link className="button outline" href="/#explore">{t("Explore events", "イベントを探す")}</Link></div>}</div>
    </>}
  </main>;
}
