import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import Field from "@/components/Field";
import DataTable from "@/components/DataTable";
import { apiPost } from "@/utils/api";
import { extractArray, type Row } from "@/utils/extract";

export default function Finance() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400_000).toISOString());
  const [to, setTo] = useState(() => new Date().toISOString());
  const [page, setPage] = useState("1");
  const [pageSize, setPageSize] = useState("50");
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const body = useMemo(
    () => ({
      filter: {
        date: { from, to },
      },
      page: Number(page),
      page_size: Number(pageSize),
    }),
    [from, to, page, pageSize],
  );

  async function run() {
    setLoading(true);
    setErr(null);
    setRows([]);
    try {
      const r = await apiPost<unknown>("/ozon/finance/transaction/list", body);
      if (r.ok === false) {
        setErr(r.raw || r.error);
        setRows([]);
      } else {
        setRows(extractArray(r.data));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <Panel
          title="交易流水（transaction/list）"
          subtitle="无需填 JSON：只填时间范围与分页即可。时间为 UTC（ISO8601）。"
          right={
            <button
              type="button"
              onClick={() => void run()}
              className="inline-flex items-center gap-2 rounded-lg bg-azure-600 px-3 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-azure-500 active:scale-[0.98] disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "请求中…" : "查询"}
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="from (UTC)" value={from} onChange={setFrom} />
                <Field label="to (UTC)" value={to} onChange={setTo} />
                <Field label="page" type="number" value={page} onChange={setPage} />
                <Field label="page_size" type="number" value={pageSize} onChange={setPageSize} hint="建议 50" />
              </div>
              <div className="text-[12px] text-slate-500 dark:text-slate-400">
                下一版会把余额、汇总 totals、现金流报表整合成一个“对账驾驶舱”。
              </div>
            </div>
            <div className="space-y-3">
              {err ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  {err}
                </div>
              ) : null}
              <DataTable rows={rows} emptyText={loading ? "加载中…" : "暂无数据"} />
            </div>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
