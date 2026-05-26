import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import Field from "@/components/Field";
import DataTable from "@/components/DataTable";
import { apiPost } from "@/utils/api";
import { extractArray, type Row } from "@/utils/extract";

export default function Returns() {
  const [limit, setLimit] = useState("50");
  const [offset, setOffset] = useState("0");
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const body = useMemo(
    () => ({
      limit: Number(limit),
      offset: Number(offset),
    }),
    [limit, offset],
  );

  async function run() {
    setLoading(true);
    setErr(null);
    setRows([]);
    try {
      const r = await apiPost<unknown>("/ozon/returns/rfbs/list", body);
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
          title="退货列表（rFBS）"
          subtitle="无需填 JSON：只填分页即可。"
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
                <Field label="limit" type="number" value={limit} onChange={setLimit} hint="1 ~ 1000" />
                <Field label="offset" type="number" value={offset} onChange={setOffset} />
              </div>
              <div className="text-[12px] text-slate-500 dark:text-slate-400">
                退货详情/拒收/确认收货/退款会在下一版做成“行内操作按钮”，当前先保证不需要填 JSON。
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
