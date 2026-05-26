import { apiPost } from "@/utils/api";

export type TranslateItem = { text: string; translated: string; error?: string };

export async function translateOnline(texts: string[]): Promise<TranslateItem[]> {
  const uniq = Array.from(new Set(texts.map((s) => String(s || "").trim()).filter(Boolean)));
  if (!uniq.length) return [];
  const r = await apiPost<{ items: TranslateItem[] }>("/tools/translate", { texts: uniq, from: "auto", to: "zh" });
  if (r.ok === false) throw new Error(r.raw || r.error);
  return Array.isArray((r.data as any)?.items) ? (r.data as any).items : [];
}
