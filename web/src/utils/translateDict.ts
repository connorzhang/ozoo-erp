type Dict = Record<string, string>;

const STORAGE_KEY = "ozon_translate_dict_v1";

export function getDict(): Dict {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const v = JSON.parse(raw) as Dict;
    if (!v || typeof v !== "object") return {};
    return v;
  } catch {
    return {};
  }
}

export function saveDict(v: Dict) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
}

export function t(text: string): string {
  const s = String(text || "").trim();
  if (!s) return "";
  const d = getDict();
  return String(d[s] || "");
}

export function upsertTranslations(items: Array<{ text: string; translated: string }>) {
  const d = getDict();
  let changed = false;
  for (const it of items) {
    const k = String(it.text || "").trim();
    const v = String(it.translated || "").trim();
    if (!k || !v) continue;
    if (d[k] === v) continue;
    d[k] = v;
    changed = true;
  }
  if (changed) saveDict(d);
}

