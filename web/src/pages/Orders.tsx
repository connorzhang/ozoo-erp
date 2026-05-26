import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import Field from "@/components/Field";
import DataTable from "@/components/DataTable";
import { apiPost } from "@/utils/api";
import { extractArray, type Row } from "@/utils/extract";

export default function Orders() {
  const nav = useNavigate();
  const [since, setSince] = useState(() => toLocalInput(new Date(Date.now() - 14 * 86400_000)));
  const [to, setTo] = useState(() => toLocalInput(new Date()));
  const [limit, setLimit] = useState("20");
  const [offset, setOffset] = useState("0");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const body = useMemo(() => {
    const f: Record<string, unknown> = {
      since: toIsoZFromLocal(since),
      to: toIsoZFromLocal(to),
    };
    if (status.trim()) f.status = status.trim();
    return {
      dir: "ASC",
      filter: f,
      limit: Number(limit),
      offset: Number(offset),
      with: { analytics_data: true, financial_data: false, barcodes: false, translit: true },
    };
  }, [since, to, status, limit, offset]);

  const listRows = useMemo(() => {
    return rows.map((r) => ({
      posting_number: (r as any).posting_number,
      order_number: (r as any).order_number,
      status: (r as any).status,
      product_summary: summarizeProducts((r as any).products),
      total_amount: sumAmount((r as any).products),
      delivery_method: (r as any).delivery_method?.name || (r as any).delivery_method,
      tracking_number: (r as any).tracking_number,
      shipment_date: (r as any).shipment_date,
      action: "",
    }));
  }, [rows]);

  async function run() {
    setLoading(true);
    setErr(null);
    setRows([]);
    try {
      const r = await apiPost<unknown>("/ozon/posting/fbs/list", body);
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

  function openDetail(row: Row) {
    const postingNumber = String((row as any).posting_number || "");
    if (!postingNumber) return;
    nav(`/orders/${encodeURIComponent(postingNumber)}`);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <Panel
          title="订单列表（FBS 发货单）"
          subtitle="先按条件查询列表，点击某一行查看详情。时间使用北京时间输入，系统自动转换为 UTC。"
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
                <Field label="开始时间(北京时间)" type="datetime-local" value={since} onChange={setSince} />
                <Field label="结束时间(北京时间)" type="datetime-local" value={to} onChange={setTo} />
                <Field label="每页数量" type="number" value={limit} onChange={setLimit} hint="1 ~ 50" />
                <Field label="偏移(offset)" type="number" value={offset} onChange={setOffset} />
              </div>
              <Field
                label="状态（可选）"
                value={status}
                onChange={setStatus}
                placeholder="awaiting_packaging / awaiting_deliver / delivering ..."
                hint="留空=全部状态"
              />
              <div className="text-[12px] text-slate-500 dark:text-slate-400">
                列表仅显示关键信息；详细地址/商品/付款/取消原因等在“详情”中查看。
              </div>
            </div>
            <div className="space-y-3">
              {err ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  {err}
                </div>
              ) : null}
              <DataTable
                rows={listRows}
                columns={["posting_number", "order_number", "status", "product_summary", "total_amount", "delivery_method", "shipment_date", "action"]}
                columnLabels={{ action: "操作" }}
                emptyText={loading ? "加载中…" : "暂无数据"}
                onRowClick={(r) => openDetail(r as any)}
                renderCell={(r, c) => {
                  if (c !== "action") return undefined;
                  return (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(r as any);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      查看
                    </button>
                  );
                }}
              />
            </div>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function summarizeProducts(ps: any): string {
  if (!Array.isArray(ps) || !ps.length) return "—";
  const first = ps[0];
  const name = String(first?.name || first?.offer_id || "").trim();
  const qty = ps.reduce((acc: number, it: any) => acc + (Number(it?.quantity) || 0), 0);
  if (!name) return qty ? `${qty}件` : "—";
  if (qty <= 1) return `${name}（1件）`;
  return `${name} 等${qty}件`;
}

function sumAmount(ps: any): string {
  if (!Array.isArray(ps) || !ps.length) return "—";
  let sum = 0;
  let currency = "";
  for (const it of ps) {
    const q = Number(it?.quantity) || 0;
    const p = Number(String(it?.price || "").replace(",", ".")) || 0;
    sum += p * q;
    currency = currency || String(it?.currency_code || "");
  }
  if (!sum) return "—";
  const n = Math.round(sum * 100) / 100;
  return currency ? `${n} ${currency}` : String(n);
}

function toLocalInput(d: Date): string {
  const dd = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return dd.toISOString().slice(0, 16);
}

function toIsoZFromLocal(v: string): string {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toISOString();
}
