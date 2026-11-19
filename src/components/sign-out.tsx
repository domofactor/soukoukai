"use client";

import { signOut } from "next-auth/react";
import { useLocale } from "./locale-provider";
import { localizedPath } from "@/lib/locale";

export function SignOut() {
  const { locale, t } = useLocale();
  return <button className="text-button" onClick={() => signOut({ callbackUrl: localizedPath("/", locale) })}>{t("Sign out", "ログアウト")}</button>;
}
