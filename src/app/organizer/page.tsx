import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isDemo } from "@/lib/data";
import { getLocale } from "@/lib/server-locale";
import { translator } from "@/lib/locale";
import { disciplines, disciplineLabels } from "@/lib/event-types";
import { canPublish } from "@/lib/organizer-policy";
import { translationReady } from "@/lib/translation";
import { japanDate } from "@/lib/search";
import { saveEvent, eventLifecycle } from "./actions";
import { PendingButton } from "@/components/pending-button";

export const dynamic = "force-dynamic";
export default async function Organizer({ searchParams }: { searchParams: Promise<{ edit?: string; notice?: string }> }) {
  const [user, locale, params] = await Promise.all([currentUser(), getLocale(), searchParams]);
  const t = translator(locale);
  if (isDemo()) return <main id="main" className="narrow-page"><h1>{t("Organizer portal", "主催者ポータル")}</h1><p>{t("This demo does not create accounts, charge subscriptions, translate descriptions, or publish events. In live mode, organizers can manage drafts and immediately publish clearly labelled organizer-provided listings.", "デモではアカウント作成・課金・説明の翻訳・イベント公開は行いません。本番では主催者が下書きを管理し、「主催者提供」と明記されたイベントをすぐに公開できます。")}</p><Link className="button outline" href="/membership">{t("View memberships", "会員プランを見る")}</Link></main>;
  if (!user) redirect("/signin");
  if (!user.onboarded) redirect("/onboarding?type=ORGANIZER");
  if (user.accountType !== "ORGANIZER") redirect("/account?notice=role");
  const [billing, events, circuits] = await Promise.all([
    db.billing.findUnique({ where: { userId: user.id } }),
    db.event.findMany({ where: { ownerId: user.id }, orderBy: { startsAt: "desc" } }),
    db.circuit.findMany({ orderBy: { name: "asc" } })
  ]);
  const paid = canPublish({ ...user, billing });
  const edit = params.edit ? events.find((event) => event.id === params.edit) : null;
  const notices: Record<string, string> = {
    saved: t("Saved. Review the description and translation before publishing.", "保存しました。公開前に説明文と翻訳を確認してください。"),
    translation: t("Saved, but automatic translation is unavailable or failed. The original is preserved. Add a translation manually or retry; stale translations are hidden publicly.", "保存しましたが、自動翻訳が未設定または失敗しました。原文は保持されています。手動で翻訳を入力するか、再試行してください。古い翻訳は公開されません。"),
    subscription: t("An active Organizer subscription is required to create, edit, translate, or publish. Withdrawal and deletion remain available.", "作成・編集・翻訳・公開には有効な主催者会員登録が必要です。公開停止と削除は引き続き利用できます。"),
    ownership: t("That listing is not yours to manage.", "このイベントを管理する権限がありません。"),
    conflict: t("This listing changed in another request. Reload it before saving again.", "別の操作で更新されました。再読み込みしてから保存してください。"),
    invalid: t("Check all fields, including the JST date, HTTPS URL and description length.", "各項目を確認してください。日時は日本時間、URLはHTTPS、説明文は5000文字以内です。"),
    failed: t("The change could not be completed. Please retry.", "変更を完了できませんでした。もう一度お試しください。"),
    published: t("Published immediately as organizer-provided, not independently verified.", "「主催者提供・独立検証なし」として公開しました。"),
    withdrawn: t("Withdrawn from discovery and future alerts.", "公開を停止しました。検索結果と今後の通知には表示されません。"),
    deleted: t("Event deleted.", "イベントを削除しました。"),
    past: t("Only future events can be published.", "公開できるのは今後開催されるイベントのみです。"),
    replace: t("Add an original description. Confirm replacement before regenerating an edited translation.", "原文を入力してください。編集済みの翻訳を再生成する場合は、置き換えに同意してください。")
  };
  const localStart = edit ? `${japanDate(edit.startsAt)}T${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(edit.startsAt)}` : "";
  const translationLabels = {
    NONE: t("Not translated", "未翻訳"), AUTO: t("Automatically translated", "自動翻訳済み"), EDITED: t("Organizer-edited translation", "主催者が編集済み"),
    STALE: t("Stale translation — hidden publicly", "古い翻訳（非公開）"), FAILED: t("Translation failed / unavailable", "翻訳失敗・利用不可")
  };
  return <main id="main" className="account-page"><div className="section-heading"><div><div className="eyebrow">{t("YOUR EVENTS", "イベント管理")}</div><h1>{t("Organizer portal", "主催者ポータル")}</h1></div><Link className="button outline" href="/account">{t("Account & billing", "アカウント・決済")}</Link></div>
    {params.notice && <p className="notice" role="status">{notices[params.notice] ?? t("Unknown notice. Review your listings below.", "イベントの状態を確認してください。")}</p>}
    <p>{t("Your published events appear immediately and are labelled organizer-provided, not independently verified. You are responsible for accurate details and permissions. All event times are JST.", "公開したイベントはすぐに表示され、「主催者提供・独立検証なし」と明記されます。情報の正確性と掲載権限は主催者の責任です。日時はすべて日本時間（JST）です。")}</p>
    {!paid && <p className="notice">{notices.subscription} <Link href="/membership">{t("View Organizer membership", "主催者会員プランを見る")}</Link></p>}
    {params.edit && !edit && <p role="alert" className="notice">{notices.ownership}</p>}
    <section className="portal-editor"><h2>{edit ? t("Edit event", "イベントを編集") : t("New draft", "下書きを作成")}</h2>
      <form action={saveEvent} className="stack-form" key={edit ? `${edit.id}-${edit.revision}` : "new"}>
        {edit && <input type="hidden" name="id" value={edit.id} />}<input type="hidden" name="revision" value={edit?.revision ?? 0} />
        <fieldset disabled={!paid} className="event-fields">
          <label>{t("Title", "イベント名")}<input name="title" required maxLength={200} defaultValue={edit?.title} /></label>
          <label>{t("Organizer display name", "主催者名")}<input name="organizer" required maxLength={200} defaultValue={edit?.organizer ?? user.name ?? ""} /></label>
          <label>{t("Circuit", "サーキット")}<select name="circuitId" required defaultValue={edit?.circuitId}>{circuits.map((circuit) => <option value={circuit.id} key={circuit.id}>{locale === "ja" ? circuit.nameJa : circuit.name}</option>)}</select></label>
          <label>{t("Start date & time (JST)", "開始日時（日本時間）")}<input type="datetime-local" name="startsAt" required defaultValue={localStart} /></label>
          <label>{t("Entry fee (JPY; blank if unknown)", "参加費（円・不明なら空欄）")}<input name="priceYen" type="number" min={0} max={10000000} step={1} defaultValue={edit?.priceYen ?? ""} /></label>
          <label>{t("Event type", "イベント種別")}<select name="discipline" defaultValue={edit?.discipline}>{disciplines.map((type) => <option key={type} value={type}>{disciplineLabels[type][locale]}</option>)}</select></label>
          <label>{t("Official event / booking URL (HTTPS)", "公式イベント・申込URL（HTTPS）")}<input name="sourceUrl" type="url" pattern="https://.*" required maxLength={2000} defaultValue={edit?.sourceUrl} /></label>
          <label className="check-label"><input type="checkbox" name="beginner" defaultChecked={edit?.beginner} />{t("Beginner-friendly", "初心者歓迎")}</label>
          <label>{t("Original language", "原文の言語")}<select name="descriptionLanguage" defaultValue={edit?.descriptionLanguage ?? locale}><option value="en">English</option><option value="ja">日本語</option></select></label>
          <label>{t("Description (optional, up to 5,000 characters)", "説明（任意・5000文字以内）")}<textarea name="descriptionOriginal" rows={6} maxLength={5000} defaultValue={edit?.descriptionOriginal ?? ""} /></label>
          <p className="small">{t("On save, new or changed originals are sent to DeepL for translation into the other language unless you have edited the translation. No personal or confidential information. Edited translations are never silently replaced; changing the original marks them stale until you edit or explicitly regenerate them.", "保存時、翻訳が手動編集されていなければ、新規・変更された原文をDeepLに送信してもう一方の言語に翻訳します。個人情報や機密情報は入力しないでください。手動編集した翻訳は自動で置き換えません。原文を変更すると、翻訳の編集または明示的な再生成まで古い翻訳として扱います。")}</p>
          {!translationReady() && <p className="notice">{t("Automatic translation is not configured. You can still supply an editable translation manually.", "自動翻訳は未設定です。手動で翻訳を入力できます。")}</p>}
          <label>{t("Translation (opposite language, editable)", "翻訳（もう一方の言語・編集可能）")}<textarea name="descriptionTranslation" rows={6} maxLength={10000} defaultValue={edit?.descriptionTranslation ?? ""} /></label>
          {edit && <p className="small" role="status">{translationLabels[edit.translationStatus]}</p>}
          <PendingButton>{t("Save & translate", "保存・翻訳")}</PendingButton>
        </fieldset>
      </form>
      {edit && <form action={eventLifecycle} className="stack-form"><input type="hidden" name="id" value={edit.id} /><input type="hidden" name="revision" value={edit.revision} /><input type="hidden" name="intent" value="translate" />
        <p className="small">{t("Save any form edits above before regenerating. This uses the saved original.", "再生成前に上のフォームを保存してください。保存済みの原文を使用します。")}</p>
        {edit.translationEdited && <label className="check-label"><input name="replace" type="checkbox" required />{t("Replace my edited translation with a new automatic translation", "編集済みの翻訳を新しい自動翻訳で置き換える")}</label>}
        <PendingButton disabled={!paid || !edit.descriptionOriginal || !translationReady()} className="button outline">{t("Regenerate saved translation", "保存済み翻訳を再生成")}</PendingButton></form>}
      {edit && <Link className="text-button" href="/organizer">{t("Create another event", "別のイベントを作成")}</Link>}
    </section>
    <h2>{t("Your listings", "自分のイベント一覧")}</h2><div className="event-list">{events.length ? events.map((event) => <article className="portal-listing" key={event.id}>
      <div><h3>{event.title}</h3><p>{japanDate(event.startsAt)} JST · {disciplineLabels[event.discipline][locale]} · {event.status === "ORGANIZER" ? t("Published · organizer-provided", "公開中・主催者提供") : t("Draft / withdrawn", "下書き・公開停止")}</p><Link className="text-button" href={`/organizer?edit=${event.id}`}>{t("Open / edit", "開く・編集")}</Link></div>
      <form action={eventLifecycle} className="portal-controls"><input type="hidden" name="id" value={event.id} /><input type="hidden" name="revision" value={event.revision} />
        {event.status === "DRAFT" ? <PendingButton disabled={!paid} name="intent" value="publish">{t("Publish now", "すぐに公開")}</PendingButton> : <PendingButton className="button outline" name="intent" value="withdraw">{t("Withdraw", "公開停止")}</PendingButton>}
        <PendingButton className="button outline" name="intent" value="delete">{t("Delete permanently", "完全に削除")}</PendingButton>
      </form></article>) : <p>{t("No events yet. Create a draft above.", "まだイベントはありません。上のフォームで下書きを作成してください。")}</p>}</div>
  </main>;
}
