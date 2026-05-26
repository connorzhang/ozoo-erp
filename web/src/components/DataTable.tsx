import { useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatValue, labelForKey } from "@/utils/labels";

type Row = Record<string, unknown>;

export default function DataTable(props: {
  rows: Row[];
  columns?: string[];
  columnLabels?: Record<string, string>;
  emptyText?: string;
  className?: string;
  onRowClick?: (row: Row) => void;
  renderCell?: (row: Row, col: string) => ReactNode;
}) {
  const cols = useMemo(() => {
    if (props.columns?.length) return props.columns;
    const first = props.rows[0];
    if (!first) return [];
    return Object.keys(first).slice(0, 10);
  }, [props.columns, props.rows]);

  if (!props.rows.length) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-[12px] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400",
          props.className,
        )}
      >
        {props.emptyText ?? "暂无数据"}
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5", props.className)}>
      <div className="overflow-auto">
        <table className="min-w-full table-fixed">
          <thead className="bg-slate-50 text-left text-[11px] text-slate-600 dark:bg-white/5 dark:text-slate-300">
            <tr>
              {cols.map((c) => (
                <th key={c} className="px-4 py-3 font-semibold">
                  {props.columnLabels?.[c] ?? labelForKey(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[12px] text-slate-800 dark:text-slate-100">
            {props.rows.map((r, idx) => (
              <tr
                key={idx}
                onClick={props.onRowClick ? () => props.onRowClick?.(r) : undefined}
                className={cn(
                  "border-t border-slate-200/60 hover:bg-slate-50/70 dark:border-white/10 dark:hover:bg-white/5",
                  props.onRowClick ? "cursor-pointer" : "",
                )}
              >
                {cols.map((c) => (
                  <td key={c} className="px-4 py-3 align-top">
                    {(() => {
                      const custom = props.renderCell ? props.renderCell(r, c) : undefined;
                      return custom === undefined ? <Cell k={c} v={r[c]} /> : custom;
                    })()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell(props: { k: string; v: unknown }) {
  const v = props.v;
  if (v == null) return <span className="text-slate-400">—</span>;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return <span className="break-words">{formatValue(props.k, v) || String(v)}</span>;
  if (Array.isArray(v)) return <span className="text-slate-500">{`[${v.length}]`}</span>;
  return <span className="text-slate-500">[对象]</span>;
}

