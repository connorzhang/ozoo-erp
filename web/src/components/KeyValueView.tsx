import { Fragment, useMemo } from "react";
import { formatValue, labelForKey } from "@/utils/labels";

export default function KeyValueView(props: { value: unknown; maxDepth?: number }) {
  const rows = useMemo(() => flatten(props.value, props.maxDepth ?? 3), [props.value, props.maxDepth]);
  if (!rows.length) return <div className="text-[12px] text-slate-500 dark:text-slate-400">暂无数据</div>;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="divide-y divide-slate-200/70 dark:divide-white/10">
        {rows.map((r) => (
          <div key={r.k} className="grid grid-cols-[240px_1fr] gap-4 px-4 py-3 text-[12px]">
            <div className="truncate text-slate-500 dark:text-slate-400">
              {labelForKey(r.k)}
              <span className="ml-2 font-mono text-[11px] opacity-70">{r.k}</span>
            </div>
            <div className="min-w-0 break-words text-slate-800 dark:text-slate-100">{r.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function flatten(v: unknown, maxDepth: number) {
  const out: { k: string; v: string }[] = [];
  walk(v, "", 0);
  return out;

  function walk(cur: unknown, prefix: string, depth: number) {
    if (cur == null) {
      if (prefix) out.push({ k: prefix, v: "—" });
      return;
    }
    if (typeof cur === "string" || typeof cur === "number" || typeof cur === "boolean") {
      const k = prefix || "$";
      out.push({ k, v: formatValue(k, cur) || String(cur) });
      return;
    }
    if (Array.isArray(cur)) {
      if (depth >= maxDepth) {
        out.push({ k: prefix || "$", v: `[数组 ${cur.length}]` });
        return;
      }
      cur.slice(0, 50).forEach((it, i) => walk(it, join(prefix, String(i)), depth + 1));
      if (cur.length > 50) out.push({ k: join(prefix, "…"), v: `剩余 ${cur.length - 50} 项` });
      return;
    }
    if (typeof cur === "object") {
      if (depth >= maxDepth) {
        out.push({ k: prefix || "$", v: "[对象]" });
        return;
      }
      for (const [k, val] of Object.entries(cur as Record<string, unknown>)) {
        walk(val, join(prefix, k), depth + 1);
      }
    }
  }

  function join(a: string, b: string) {
    return a ? `${a}.${b}` : b;
  }
}

function _(_: never) {
  return <Fragment />;
}

