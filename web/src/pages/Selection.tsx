import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import Field, { TextareaField } from "@/components/Field";
import DataTable from "@/components/DataTable";
import { apiPost, apiPostForm } from "@/utils/api";
import React from "react";
import { extractArray, type Row } from "@/utils/extract";
import Tabs from "@/components/Tabs";

export default function Selection() {
  const [tab, setTab] = useState<"top" | "text" | "product-queries" | "import">("import");
  const [topLimit, setTopLimit] = useState("10");
  const [topRows, setTopRows] = useState<Row[]>([]);
  const [topErr, setTopErr] = useState<string | null>(null);
  const [topLoading, setTopLoading] = useState(false);

  const [textQuery, setTextQuery] = useState("iphone");
  const [textLimit, setTextLimit] = useState("10");
  const [textRows, setTextRows] = useState<Row[]>([]);
  const [textErr, setTextErr] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);

  const [skus, setSkus] = useState("");
  const [dateFrom, setDateFrom] = useState(() => toIsoZ(daysAgo(14)));
  const [dateTo, setDateTo] = useState(() => toIsoZ(new Date()));
  const [page, setPage] = useState("1");
  const [pageSize, setPageSize] = useState("50");
  const [pqRows, setPqRows] = useState<Row[]>([]);
  const [pqErr, setPqErr] = useState<string | null>(null);
  const [pqLoading, setPqLoading] = useState(false);

  
  const [importRows, setImportRows] = useState<Row[]>([]);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportErr(null);
    setImportRows([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await apiPostForm<any>("/api/selection/import-excel", fd);
      if (r.ok === false) {
        setImportErr(r.raw || r.error);
      } else {
        setImportRows(r.data?.items || []);
      }
    } finally {
      setImportLoading(false);
      e.target.value = ""; // reset
    }
  }

  const skuList = useMemo(() => splitLinesToStrings(skus), [skus]);

  async function runTop() {
    setTopLoading(true);
    setTopErr(null);
    setTopRows([]);
    try {
      const body = { limit: Number(topLimit) };
      const r = await apiPost<unknown>("/ozon/search-queries/top", body);
      if (r.ok === false) {
        setTopErr(humanizeOzonError(r.raw || r.error));
        setTopRows([]);
      } else {
        setTopRows(extractArray(r.data));
      }
    } finally {
      setTopLoading(false);
    }
  }

  async function runText() {
    setTextLoading(true);
    setTextErr(null);
    setTextRows([]);
    try {
      const body = { text: textQuery, limit: Number(textLimit) };
      const r = await apiPost<unknown>("/ozon/search-queries/text", body);
      if (r.ok === false) {
        setTextErr(humanizeOzonError(r.raw || r.error));
        setTextRows([]);
      } else {
        setTextRows(extractArray(r.data));
      }
    } finally {
      setTextLoading(false);
    }
  }

  async function runProductQueries() {
    setPqLoading(true);
    setPqErr(null);
    setPqRows([]);
    try {
      const body = {
        skus: skuList.map((x) => Number(x)).filter((x) => Number.isFinite(x)),
        date_from: dateFrom,
        date_to: dateTo,
        page: Number(page),
        page_size: Number(pageSize),
      };
      const r = await apiPost<unknown>("/ozon/analytics/product-queries", body);
      if (r.ok === false) {
        setPqErr(humanizeOzonError(r.raw || r.error));
        setPqRows([]);
      } else {
        setPqRows(extractArray(r.data));
      }
    } finally {
      setPqLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as any)}

          items={[
            { value: "import", label: "选品库(Excel导入)" },
            { value: "top", label: "搜索词 Top" },

            { value: "text", label: "搜索词联想" },
            { value: "product-queries", label: "商品查询表现" },
          ]}
        />


        {tab === "import" ? (
          <Panel
            title="选品库 (Excel 导入)"
            subtitle="导入选品核算表，自动提取成本、利润与货源平台链接"
            right={
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-azure-600 px-3 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-azure-500 active:scale-[0.98]">
                <span>{importLoading ? "上传中…" : "上传 Excel"}</span>
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} disabled={importLoading} />
              </label>
            }
          >
            <div className="space-y-3">
              {importErr ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  {importErr}
                </div>
              ) : null}
              <DataTable 
                rows={importRows} 
                emptyText={importLoading ? "加载中…" : "请上传包含「成本」「利润」「1688链接/拼多多」的选品表"} 
                renderCell={(row, col) => {
                  if (col === "source_url" && row.source_url) {
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">{row.source_platform}</span>
                        <a href={row.source_url as string} target="_blank" rel="noreferrer" className="text-azure-600 hover:underline">
                          打开链接
                        </a>
                      </div>
                    );
                  }
                  if (col === "cost") return `¥${row.cost || 0}`;
                  if (col === "profit") return <span className="text-emerald-600 font-medium">¥{row.profit || 0}</span>;
                  return undefined;
                }}
              />
            </div>
          </Panel>
        ) : null}

        {tab === "top" ? (
          <Panel
          title="搜索词 Top"
          subtitle="无需填 JSON。若返回 403，通常表示该接口需要 Premium Pro 订阅。"
          right={
            <button
              type="button"
              onClick={() => void runTop()}
              className="inline-flex items-center gap-2 rounded-lg bg-azure-600 px-3 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-azure-500 active:scale-[0.98] disabled:opacity-60"
              disabled={topLoading}
            >
              {topLoading ? "请求中…" : "查询"}
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-4">
              <Field label="返回条数" type="number" value={topLimit} onChange={setTopLimit} hint="1 ~ 50" />
              <div className="text-[12px] text-slate-500 dark:text-slate-400">
                说明：当前账号若无 Premium Pro，会提示“Method available with Premium Pro subscription”。
              </div>
            </div>
            <div className="space-y-3">
              {topErr ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  {topErr}
                </div>
              ) : null}
              <DataTable rows={topRows} emptyText={topLoading ? "加载中…" : "暂无数据"} />
            </div>
          </div>
          </Panel>
        ) : null}

        {tab === "text" ? (
          <Panel
          title="搜索词联想（Text）"
          subtitle="无需填 JSON。用于给关键词做扩词/联想。"
          right={
            <button
              type="button"
              onClick={() => void runText()}
              className="inline-flex items-center gap-2 rounded-lg bg-azure-600 px-3 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-azure-500 active:scale-[0.98] disabled:opacity-60"
              disabled={textLoading}
            >
              {textLoading ? "请求中…" : "查询"}
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-4">
              <Field label="关键词" value={textQuery} onChange={setTextQuery} hint="1~300 字符" />
              <Field label="返回条数" type="number" value={textLimit} onChange={setTextLimit} hint="1 ~ 50" />
            </div>
            <div className="space-y-3">
              {textErr ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  {textErr}
                </div>
              ) : null}
              <DataTable rows={textRows} emptyText={textLoading ? "加载中…" : "暂无数据"} />
            </div>
          </div>
          </Panel>
        ) : null}

        {tab === "product-queries" ? (
          <Panel
          title="商品查询表现（product-queries）"
          subtitle="按 SKU 查询“查询→展现/点击/转化”信号。"
          right={
            <button
              type="button"
              onClick={() => void runProductQueries()}
              className="inline-flex items-center gap-2 rounded-lg bg-azure-600 px-3 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-azure-500 active:scale-[0.98] disabled:opacity-60"
              disabled={pqLoading}
            >
              {pqLoading ? "请求中…" : "查询"}
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-4">
              <TextareaField
                label="SKU 列表"
                value={skus}
                onChange={setSkus}
                placeholder="每行一个 SKU（数字）"
                hint="1 ~ 1000 个"
                rows={5}
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="date_from (UTC)" value={dateFrom} onChange={setDateFrom} placeholder="2026-05-01T00:00:00Z" />
                <Field label="date_to (UTC)" value={dateTo} onChange={setDateTo} placeholder="2026-05-17T00:00:00Z" />
                <Field label="page" type="number" value={page} onChange={setPage} />
                <Field label="page_size" type="number" value={pageSize} onChange={setPageSize} hint="1 ~ 1000" />
              </div>
            </div>
            <div className="space-y-3">
              {pqErr ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  {pqErr}
                </div>
              ) : null}
              <DataTable rows={pqRows} emptyText={pqLoading ? "加载中…" : skuList.length ? "暂无数据" : "请先填入至少 1 个 SKU"} />
            </div>
          </div>
          </Panel>
        ) : null}
      </div>
    </AppShell>
  );
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function toIsoZ(d: Date) {
  return d.toISOString();
}

function splitLinesToStrings(v: string) {
  return v
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function humanizeOzonError(raw: string) {
  if (!raw) return "请求失败";
  if (raw.includes("Premium Pro")) return "当前账号无 Premium Pro 订阅，该接口被限制（403）。";
  return raw;
}
