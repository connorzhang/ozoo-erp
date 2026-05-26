export type Row = Record<string, unknown>;

export function extractArray(data: unknown): Row[] {
  if (!data) return [];
  if (Array.isArray(data)) return data.filter(isRow);
  if (typeof data !== "object") return [];

  const o = data as Record<string, unknown>;

  const directCandidates: unknown[] = [
    o.items,
    o.queries,
    o.postings,
    o.operations,
    o.returns,
    o.result,
    (o.result as any)?.items,
    (o.result as any)?.queries,
    (o.result as any)?.postings,
    (o.result as any)?.operations,
    (o.result as any)?.returns,
    (o.result as any)?.categories,
  ];

  for (const c of directCandidates) {
    if (Array.isArray(c)) return c.filter(isRow);
  }

  return [];
}

export function isRow(v: unknown): v is Row {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

