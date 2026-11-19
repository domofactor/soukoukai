import { cookies, headers } from "next/headers";
import { normalizeLocale } from "./locale";

export async function getLocale() {
  const override = (await headers()).get("x-soukoukai-locale");
  return normalizeLocale(override ?? (await cookies()).get("locale")?.value);
}
