"use client";
import { useFormStatus } from "react-dom";
import { useLocale } from "./locale-provider";

export function PendingButton({ children, className = "button dark", disabled = false, ...props }: {
  children: React.ReactNode; className?: string; disabled?: boolean; name?: string; value?: string;
}) {
  const { pending } = useFormStatus();
  const { t } = useLocale();
  return <button {...props} className={className} disabled={disabled || pending}>{pending ? t("Working…", "処理中…") : children}</button>;
}
