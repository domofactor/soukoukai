import type { Locale } from "./locale";

export class TranslationError extends Error {}
export function translationReady() { return Boolean(process.env.DEEPL_API_KEY); }
export async function translateDescription(text: string, source: Locale, fetcher: typeof fetch = fetch) {
  if (!process.env.DEEPL_API_KEY) throw new TranslationError("Translation provider is not configured.");
  const endpoint = process.env.DEEPL_API_PLAN === "pro" ? "https://api.deepl.com/v2/translate" : "https://api-free.deepl.com/v2/translate";
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: { Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: [text], source_lang: source.toUpperCase(), target_lang: source === "ja" ? "EN" : "JA" }),
    signal: AbortSignal.timeout(15000), cache: "no-store"
  });
  if (!response.ok) throw new TranslationError(`Translation provider returned ${response.status}.`);
  const result: unknown = await response.json();
  const { z } = await import("zod");
  const parsed = z.object({ translations: z.array(z.object({ text: z.string().trim().min(1).max(10000) })).length(1) }).safeParse(result);
  if (!parsed.success || parsed.data.translations[0].text === text.trim()) {
    throw new TranslationError("Provider did not return a usable translation.");
  }
  return parsed.data.translations[0].text;
}
