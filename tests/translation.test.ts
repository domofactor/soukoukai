import { test, after } from "node:test";
import assert from "node:assert/strict";
import { translateDescription } from "../src/lib/translation";

const key = process.env.DEEPL_API_KEY;
const plan = process.env.DEEPL_API_PLAN;
after(() => {
  if (key === undefined) delete process.env.DEEPL_API_KEY; else process.env.DEEPL_API_KEY = key;
  if (plan === undefined) delete process.env.DEEPL_API_PLAN; else process.env.DEEPL_API_PLAN = plan;
});
test("unconfigured translation fails explicitly without contacting a provider", async () => {
  delete process.env.DEEPL_API_KEY;
  await assert.rejects(translateDescription("Original", "en", async () => { throw new Error("Must not fetch"); }), /not configured/);
});
test("DeepL requests preserve the original and request the opposite language on the server", async () => {
  process.env.DEEPL_API_KEY = "test-placeholder";
  for (const source of ["en", "ja"] as const) {
    const text = source === "en" ? "Original" : "原文";
    const result = await translateDescription(text, source, async (url, init) => {
      assert.equal(url, "https://api-free.deepl.com/v2/translate");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        text: [text], source_lang: source.toUpperCase(), target_lang: source === "en" ? "JA" : "EN"
      });
      assert.equal(new Headers(init?.headers).get("Authorization"), "DeepL-Auth-Key test-placeholder");
      return Response.json({ translations: [{ text: source === "en" ? "翻訳" : "Translated" }] });
    });
    assert.notEqual(result, text);
  }
});
test("provider failures, empty/malformed/same-text results and network errors never masquerade as success", async () => {
  process.env.DEEPL_API_KEY = "test-placeholder";
  for (const response of [new Response("", { status: 429 }), Response.json({ translations: [] }),
    Response.json({ translations: [{ text: "" }] }), Response.json({ translations: [{ text: "Original" }] })]) {
    await assert.rejects(translateDescription("Original", "en", async () => response));
  }
  await assert.rejects(translateDescription("Original", "en", async () => { throw new TypeError("Network failed"); }), /Network failed/);
  process.env.DEEPL_API_PLAN = "pro";
  await translateDescription("原文", "ja", async (url) => {
    assert.equal(url, "https://api.deepl.com/v2/translate");
    return Response.json({ translations: [{ text: "Translated" }] });
  });
});
