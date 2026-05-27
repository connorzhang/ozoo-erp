import { useEffect, useMemo, useState, type ReactNode } from "react";
import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import Field from "@/components/Field";
import DataTable from "@/components/DataTable";
import { apiGet, apiPost } from "@/utils/api";
import { extractArray, type Row } from "@/utils/extract";
import { TextareaField } from "@/components/Field";
import Tabs from "@/components/Tabs";
import KeyValueView from "@/components/KeyValueView";
import { t, upsertTranslations } from "@/utils/translateDict";
import { translateOnline } from "@/utils/translateOnline";
import UploadWizard from "@/components/UploadWizard";

export default function Listing() {
  const [tab, setTab] = useState<"categories" | "products" | "import" | "duplicates" | "upload">("categories");
  const [dictTick, setDictTick] = useState(0);
  const [treeRows, setTreeRows] = useState<Row[]>([]);
  const [treeErr, setTreeErr] = useState<string | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [catQuery, setCatQuery] = useState("");
  const [catMode, setCatMode] = useState<"cascader" | "aliases">("cascader");
  const [dictSyncLoading, setDictSyncLoading] = useState(false);
  const [dictSyncErr, setDictSyncErr] = useState<string | null>(null);
  const [dictSyncOk, setDictSyncOk] = useState<string | null>(null);
  const [cascaderLoading, setCascaderLoading] = useState(false);
  const [cascaderErr, setCascaderErr] = useState<string | null>(null);
  const [cascaderTree, setCascaderTree] = useState<any[]>([]);
  const [cascaderPath, setCascaderPath] = useState<number[]>([]);

  const [limit, setLimit] = useState("10");
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const body = useMemo(() => ({ filter: {}, last_id: "", limit: Number(limit) }), [limit]);

  const [productInfoMap, setProductInfoMap] = useState<Record<string, any>>({});
  const [productInfoErr, setProductInfoErr] = useState<string | null>(null);
  const [productInfoLoading, setProductInfoLoading] = useState(false);
  const [translateErr, setTranslateErr] = useState<string | null>(null);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [productDetailOpen, setProductDetailOpen] = useState(false);
  const [productDetailTitle, setProductDetailTitle] = useState("");
  const [productDetail, setProductDetail] = useState<any>(null);
  const [productDetailErr, setProductDetailErr] = useState<string | null>(null);
  const [productDetailLoading, setProductDetailLoading] = useState(false);

  const [aliasKey, setAliasKey] = useState("ozon_category_aliases");
  const [aliasMap, setAliasMap] = useState<Record<string, string>>(() => loadAliases("ozon_category_aliases"));

  useEffect(() => {
    setAliasMap(loadAliases(aliasKey));
  }, [aliasKey]);

  useEffect(() => {
    saveAliases(aliasKey, aliasMap);
  }, [aliasKey, aliasMap]);

  useEffect(() => {
    (async () => {
      const r = await apiGet<any>("/ozon/seller");
      if (r.ok === false) return;
      const name =
        String(r.data?.company?.name || "") ||
        String(r.data?.company?.legal_name || "") ||
        String(r.data?.company?.inn || "");
      if (!name) return;
      setAliasKey(`ozon_category_aliases:${name}`);
    })();
  }, []);

  async function syncDictCategories() {
    setDictSyncLoading(true);
    setDictSyncErr(null);
    setDictSyncOk(null);
    try {
      const r = await apiPost<any>("/dict/categories/sync", {});
      if (r.ok === false) {
        setDictSyncErr(r.raw || r.error);
        return;
      }
      const count = Number(r.data?.count || 0);
      setDictSyncOk(`已同步 ${count} 条到数据库`);
      await loadCascaderTree();
    } finally {
      setDictSyncLoading(false);
    }
  }

  async function loadCascaderTree() {
    setCascaderLoading(true);
    setCascaderErr(null);
    try {
      const r = await apiGet<any>("/dict/categories/cascader");
      if (r.ok === false) {
        setCascaderErr(r.raw || r.error);
        setCascaderTree([]);
        return;
      }
      setCascaderTree(Array.isArray(r.data?.items) ? r.data.items : []);
    } finally {
      setCascaderLoading(false);
    }
  }

  async function loadTree() {
    setTreeLoading(true);
    setTreeErr(null);
    setTreeRows([]);
    try {
      const langs = ["EN", "RU"] as const;
      let lastError = "";
      for (const lang of langs) {
        const r = await apiGet<unknown>(`/ozon/categories/tree?language=${lang}`);
        if (r.ok === false) {
          lastError = r.raw || r.error;
          continue;
        }

        const flat = flattenCategoryTree(r.data);
        const finalRows = flat.length ? flat : extractArray(r.data);
        setTreeRows(finalRows);

        if (flat.length) {
          setAliasMap((prev) => {
            const next = { ...prev };
            for (const rr of flat) {
              const id = String((rr as any).id ?? "");
              if (!id) continue;
              const name = String((rr as any).name ?? "");
              const alias = autoAlias(name);
              const cur = String(next[id] || "");
              if (cur && !isAutoPlaceholder(cur)) continue;
              if (alias) next[id] = alias;
              else if (cur) delete next[id];
            }
            return next;
          });
        }
        return;
      }

      setTreeErr(lastError || "加载失败");
    } finally {
      setTreeLoading(false);
    }
  }

  async function runList() {
    setLoading(true);
    setErr(null);
    setRows([]);
    setProductInfoMap({});
    setProductInfoErr(null);
    try {
      const r = await apiPost<unknown>("/ozon/products/list", body);
      if (r.ok === false) {
        setErr(r.raw || r.error);
        setRows([]);
      } else {
        const list = extractArray(r.data);
        setRows(list);
        void loadProductInfos(list);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadProductInfos(list: Row[]) {
    const ids = list
      .map((x) => (x as any).product_id)
      .filter((x) => x !== undefined && x !== null)
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x));
    if (!ids.length) return;

    setProductInfoLoading(true);
    setProductInfoErr(null);
    try {
      const next: Record<string, any> = {};
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const r = await apiPost<any>("/ozon/products/info/list", { offer_id: [], sku: [], product_id: chunk });
        if (r.ok === false) throw new Error(r.raw || r.error);
        const items = extractArray(r.data);
        for (const it of items) {
          const id = String((it as any).id ?? (it as any).product_id ?? "");
          if (!id) continue;
          next[id] = it;
        }
      }
      setProductInfoMap(next);
    } catch (e: any) {
      setProductInfoErr(e?.message || String(e));
    } finally {
      setProductInfoLoading(false);
    }
  }

  async function openProductDetail(row: Row) {
    setProductDetailOpen(true);
    setProductDetailErr(null);
    setProductDetail(null);
    const productId = String((row as any).product_id ?? "");
    const offerId = String((row as any).offer_id ?? "");
    const title = productId ? `商品：${offerId || productId}` : `商品：${offerId || "—"}`;
    setProductDetailTitle(title);
    if (!productId) {
      setProductDetailErr("缺少 product_id，无法查看详情");
      return;
    }
    const cached = productInfoMap[productId];
    if (cached) {
      setProductDetail(cached);
      return;
    }
    setProductDetailLoading(true);
    try {
      const r = await apiPost<any>("/ozon/products/info/list", { offer_id: [], sku: [], product_id: [Number(productId)] });
      if (r.ok === false) throw new Error(r.raw || r.error);
      const items = extractArray(r.data);
      const it = items[0] as any;
      if (it) {
        setProductDetail(it);
        const id = String(it?.id ?? "");
        if (id) setProductInfoMap((prev) => ({ ...prev, [id]: it }));
      } else {
        setProductDetailErr("未返回商品详情");
      }
    } catch (e: any) {
      setProductDetailErr(e?.message || String(e));
    } finally {
      setProductDetailLoading(false);
    }
  }

  const productRows = useMemo(() => {
    return rows.map((r) => {
      const pid = String((r as any).product_id ?? "");
      const info = pid ? productInfoMap[pid] : null;
      const name = String(info?.name ?? "");
      const nameZh = t(name);
      const price = info?.price ?? "";
      const currency = info?.currency_code ?? "";
      const statusName = info?.statuses?.status_name ?? "";
      const status = info?.statuses?.status ?? "";
      const moderate = info?.statuses?.moderate_status ?? "";
      const stock =
        info?.stocks?.stocks && Array.isArray(info.stocks.stocks)
          ? info.stocks.stocks.reduce((acc: number, it: any) => acc + (Number(it?.present) || 0), 0)
          : "";
      return {
        product_id: (r as any).product_id,
        offer_id: info?.offer_id ?? (r as any).offer_id,
        name: nameZh || name || "—",
        price: price && currency ? `${price} ${currency}` : price || "—",
        stock: stock === "" ? "—" : stock,
        status: status || statusName || "—",
        moderate_status: moderate || "—",
        action: "",
      };
    });
  }, [rows, productInfoMap, dictTick]);

  async function translateProductPage() {
    const names: string[] = [];
    const statuses: string[] = [];
    for (const r of rows) {
      const pid = String((r as any).product_id ?? "");
      const info = pid ? productInfoMap[pid] : null;
      const name = String(info?.name ?? "").trim();
      const statusName = String(info?.statuses?.status_name ?? "").trim();
      if (name && !t(name)) names.push(name);
      if (statusName && !t(statusName)) statuses.push(statusName);
    }
    const pending = [...names, ...statuses].slice(0, 60);
    if (!pending.length) return;
    setTranslateLoading(true);
    setTranslateErr(null);
    try {
      const items = await translateOnline(pending);
      upsertTranslations(items);
      setDictTick((x) => x + 1);
      const failed = items.filter((x) => !!(x as any).error || !String((x as any).translated || "").trim()).length;
      if (failed) setTranslateErr(`本次翻译成功 ${items.length - failed} 条，失败 ${failed} 条（可稍后重试）`);
    } catch (e: any) {
      setTranslateErr(e?.message || String(e));
    } finally {
      setTranslateLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as any)}
          items={[
            { value: "upload", label: "AI一键上品" },
            { value: "categories", label: "类目树" },
            { value: "products", label: "商品列表" },
            { value: "import", label: "上品任务诊断" },
            { value: "duplicates", label: "重复检测" },
          ]}
        />

        {tab === "categories" ? (
          <Panel
            title="类目树"
            subtitle="标准做法：同步全量类目到数据库，作为系统标准字典；上品/发布时用级联选择器分层选择。"
            right={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void syncDictCategories()}
                  className="inline-flex items-center gap-2 rounded-lg bg-azure-600 px-3 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-azure-500 active:scale-[0.98] disabled:opacity-60"
                  disabled={dictSyncLoading}
                >
                  {dictSyncLoading ? "同步中…" : "同步到数据库"}
                </button>
                <button
                  type="button"
                  onClick={() => void loadTree()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  disabled={treeLoading}
                >
                  {treeLoading ? "加载中…" : "从接口加载（调试）"}
                </button>
              </div>
            }
          >
            <div className="space-y-3">
              <Tabs
                value={catMode}
                onChange={(v) => setCatMode(v as any)}
                items={[
                  { value: "cascader", label: "级联选择" },
                  { value: "aliases", label: "别名表" },
                ]}
              />
              {dictSyncErr ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  {dictSyncErr}
                </div>
              ) : null}
              {dictSyncOk ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  {dictSyncOk}
                </div>
              ) : null}
              {treeErr ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  {treeErr}
                </div>
              ) : null}
              {catMode === "cascader" ? (
                <CategoryCascader
                  loading={cascaderLoading}
                  error={cascaderErr}
                  tree={cascaderTree}
                  path={cascaderPath}
                  setPath={setCascaderPath}
                  onReload={() => void loadCascaderTree()}
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
                  <div className="space-y-3">
                    <Field label="搜索（按名称/别名/ID）" value={catQuery} onChange={setCatQuery} placeholder="手机配件 / electronics / 12345" />
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-[12px] text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                      别名用于中文化展示；当前仍是本地保存。后续会把别名也迁移到数据库做成系统字典。
                    </div>
                  </div>
                  <CategoryAliasTable rows={treeRows} query={catQuery} aliasMap={aliasMap} setAliasMap={setAliasMap} loading={treeLoading} />
                </div>
              )}
            </div>
          </Panel>
        ) : null}

        {tab === "products" ? (
          <Panel
            title="商品列表"
            subtitle="面向运营：展示商品名称/价格/状态等关键信息，点击“查看”进入详情。"
            right={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void translateProductPage()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  disabled={translateLoading || !rows.length}
                >
                  {translateLoading ? "翻译中…" : "翻译本页"}
                </button>
                <button
                  type="button"
                  onClick={() => void runList()}
                  className="inline-flex items-center gap-2 rounded-lg bg-azure-600 px-3 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-azure-500 active:scale-[0.98] disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? "请求中…" : "查询"}
                </button>
              </div>
            }
          >
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="space-y-4">
                <Field label="limit" type="number" value={limit} onChange={setLimit} hint="1 ~ 1000" />
                <div className="text-[12px] text-slate-500 dark:text-slate-400">
                  上品导入属于复杂流程（类目/属性/图片/审核状态机）。下一版会做成“上品向导”。
                </div>
              </div>
              <div className="space-y-3">
                {err ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                    {err}
                  </div>
                ) : null}
                {productInfoErr ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    {productInfoErr}
                  </div>
                ) : null}
                {translateErr ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    {translateErr}
                  </div>
                ) : null}
                <DataTable
                  rows={productRows}
                  columns={["name", "offer_id", "price", "stock", "status", "moderate_status", "action"]}
                  columnLabels={{ moderate_status: "审核状态", action: "操作" }}
                  emptyText={loading ? "加载中…" : productInfoLoading ? "加载商品信息…" : "暂无数据"}
                  onRowClick={(r) => void openProductDetail(r as any)}
                  renderCell={(r, c) => {
                    if (c !== "action") return undefined;
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void openProductDetail(r as any);
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
        ) : null}

        {tab === "upload" ? <UploadWizard /> : null}
        {tab === "import" ? <ImportTaskInspector /> : null}
        {tab === "duplicates" ? <DuplicateCheck /> : null}
      </div>

      <Drawer open={productDetailOpen} title={productDetailTitle} onClose={() => setProductDetailOpen(false)}>
        {productDetailErr ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            {productDetailErr}
          </div>
        ) : null}
        {productDetailLoading ? <div className="text-[12px] text-slate-500 dark:text-slate-400">加载中…</div> : null}
        {productDetail ? <KeyValueView value={productDetail} maxDepth={4} /> : null}
      </Drawer>
    </AppShell>
  );
}

function Drawer(props: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={props.onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-[860px] border-l border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">{props.title}</div>
            <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">点击遮罩或右侧按钮关闭</div>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            关闭
          </button>
        </div>
        <div className="h-[calc(100%-64px)] overflow-auto p-5">{props.children}</div>
      </div>
    </div>
  );
}

function flattenCategoryTree(data: unknown): Row[] {
  if (!data) return [];
  const root = (data as any).result ?? data;
  if (!Array.isArray(root)) return [];

  const out: Row[] = [];

  function walk(n: any, depth: number) {
    if (!n || typeof n !== "object") return;
    const id = n.description_category_id ?? n.category_id ?? n.id;
    const name = n.category_name ?? n.title ?? n.name;
    const children = Array.isArray(n.children) ? n.children : [];
    const categoryChildren = children.filter((c: any) => {
      const cid = c?.description_category_id ?? c?.category_id ?? c?.id;
      const cname = c?.category_name ?? c?.title ?? c?.name;
      return cid !== undefined && cid !== null && cname !== undefined && cname !== null;
    });

    if (id !== undefined && id !== null && name !== undefined && name !== null) {
      out.push({
        id,
        name,
        depth,
        children: categoryChildren.length,
        type_id: n.type_id,
      });
    }

    categoryChildren.forEach((c: any) => walk(c, depth + 1));
  }

  root.forEach((n: any) => walk(n, 0));
  return out;
}

function CategoryAliasTable(props: {
  rows: Row[];
  query: string;
  aliasMap: Record<string, string>;
  setAliasMap: (v: Record<string, string>) => void;
  loading: boolean;
}) {
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateErr, setTranslateErr] = useState<string | null>(null);
  const [maxRows, setMaxRows] = useState(200);

  const { rows, total, matched } = useMemo(() => {
    const q = props.query.trim().toLowerCase();
    const base = props.rows.map((r) => {
      const id = String((r as any).id ?? "");
      const name = String((r as any).name ?? "");
      const alias = props.aliasMap[id] || "";
      return { id, name, alias, depth: (r as any).depth ?? 0, children: (r as any).children ?? 0 };
    });
    if (!q) return { rows: base.slice(0, maxRows), total: base.length, matched: base.length };
    const filtered = base.filter(
      (x) =>
        x.id.toLowerCase().includes(q) ||
        x.name.toLowerCase().includes(q) ||
        x.alias.toLowerCase().includes(q),
    );
    return { rows: filtered.slice(0, maxRows), total: base.length, matched: filtered.length };
  }, [props.rows, props.query, props.aliasMap, maxRows]);

  async function translateVisible() {
    const need = rows
      .filter((x) => !x.alias || isAutoPlaceholder(x.alias))
      .map((x) => x.name)
      .filter((x) => x && !t(x))
      .slice(0, 80);
    if (!need.length) return;
    setTranslateLoading(true);
    setTranslateErr(null);
    try {
      const items = await translateOnline(need);
      upsertTranslations(items);
      const m = new Map(items.map((it) => [it.text, it.translated]));
      const next = { ...props.aliasMap };
      for (const x of rows) {
        if (x.alias && !isAutoPlaceholder(x.alias)) continue;
        const zh = m.get(x.name) || t(x.name);
        if (!zh) continue;
        next[x.id] = zh;
      }
      props.setAliasMap(next);
      const failed = items.filter((x) => !!(x as any).error || !String((x as any).translated || "").trim()).length;
      if (failed) setTranslateErr(`本次翻译成功 ${items.length - failed} 条，失败 ${failed} 条（可稍后重试）`);
    } catch (e: any) {
      setTranslateErr(e?.message || String(e));
    } finally {
      setTranslateLoading(false);
    }
  }

  if (props.loading) return <DataTable rows={[]} emptyText="加载中…" />;
  if (!props.rows.length) return <DataTable rows={[]} emptyText="请先加载类目树" />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-500 dark:text-slate-400">
          <div>
            总类目 {total}；匹配 {matched}；当前显示 {rows.length}（上限 {maxRows}）。列表可滚动查看更多。
          </div>
          <label className="flex items-center gap-2">
            <span>显示上限</span>
            <select
              value={String(maxRows)}
              onChange={(e) => setMaxRows(Math.max(1, Number(e.target.value) || 200))}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] text-slate-800 shadow-sm outline-none focus:border-azure-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            >
              <option value="200">200</option>
              <option value="500">500</option>
              <option value="1000">1000</option>
              <option value="2000">2000</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() => void translateVisible()}
          disabled={translateLoading || props.loading || !rows.length}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          {translateLoading ? "翻译中…" : "在线翻译当前列表"}
        </button>
      </div>
      {translateErr ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {translateErr}
        </div>
      ) : null}

      <div className="max-h-[70vh] overflow-auto rounded-2xl border border-slate-200 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5">
        <table className="min-w-full table-fixed">
          <thead className="bg-slate-50 text-left text-[11px] text-slate-600 dark:bg-white/5 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">原名称</th>
              <th className="px-4 py-3 font-semibold">中文别名</th>
              <th className="px-4 py-3 font-semibold">层级</th>
              <th className="px-4 py-3 font-semibold">子类</th>
            </tr>
          </thead>
          <tbody className="text-[12px] text-slate-800 dark:text-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-200/60 hover:bg-slate-50/70 dark:border-white/10 dark:hover:bg-white/5">
                <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">{r.id}</td>
                <td className="px-4 py-3">{r.name || "—"}</td>
                <td className="px-4 py-3">
                  <input
                    value={r.alias}
                    onChange={(e) =>
                      props.setAliasMap({
                        ...props.aliasMap,
                        [r.id]: e.target.value,
                      })
                    }
                    placeholder="例如：手机配件"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-800 shadow-sm outline-none focus:border-azure-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                  />
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{String(r.depth ?? 0)}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{String(r.children ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-slate-200/70 px-4 py-3 text-[11px] text-slate-500 dark:border-white/10 dark:text-slate-400">
          {matched > maxRows ? `已截断：仅显示前 ${maxRows} 条（建议用搜索缩小范围）。` : "已显示全部匹配项。"} 别名仅本地保存。
        </div>
      </div>
    </div>
  );
}

function CategoryCascader(props: {
  loading: boolean;
  error: string | null;
  tree: any[];
  path: number[];
  setPath: (v: number[]) => void;
  onReload: () => void;
}) {
  const { levels, selected } = useMemo(() => {
    const levels: any[][] = [];
    let opts = Array.isArray(props.tree) ? props.tree : [];
    let selected: any = null;
    for (let i = 0; i < 20; i++) {
      if (!opts.length) break;
      levels.push(opts);
      const id = props.path[i];
      if (!id) break;
      const node = opts.find((x) => Number(x?.value) === Number(id));
      if (!node) break;
      selected = node;
      opts = Array.isArray(node?.children) ? node.children : [];
      if (!opts.length) break;
    }
    return { levels, selected };
  }, [props.tree, props.path]);

  const selectedText = useMemo(() => {
    if (!props.path.length || !Array.isArray(props.tree) || !props.tree.length) return "";
    const parts: string[] = [];
    let opts = props.tree;
    for (const id of props.path) {
      if (!id) break;
      const node = opts.find((x) => Number(x?.value) === Number(id));
      if (!node) break;
      parts.push(String(node.label || node.value));
      opts = Array.isArray(node.children) ? node.children : [];
    }
    return parts.join(" / ");
  }, [props.tree, props.path]);

  function setAt(level: number, v: string) {
    const id = Number(v || 0);
    const next = props.path.slice(0, level);
    if (id) next.push(id);
    props.setPath(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12px] text-slate-600 dark:text-slate-300">用于上品/发布时分层选择类目（数据源：数据库类目字典）。</div>
        <button
          type="button"
          onClick={props.onReload}
          disabled={props.loading}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          {props.loading ? "加载中…" : "从数据库加载"}
        </button>
      </div>

      {props.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {props.error}
        </div>
      ) : null}

      {!props.tree?.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-[12px] text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          先点右上角“同步到数据库”，然后点“从数据库加载”。
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {levels.map((opts, i) => (
              <select
                key={i}
                value={String(props.path[i] || "")}
                onChange={(e) => setAt(i, e.target.value)}
                className="h-9 max-w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-800 shadow-sm outline-none focus:border-azure-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              >
                <option value="">请选择</option>
                {opts.map((x) => (
                  <option key={String(x?.value)} value={String(x?.value)}>
                    {String(x?.label || x?.value)}
                  </option>
                ))}
              </select>
            ))}
          </div>

          {selectedText ? (
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-[12px] text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              <div className="font-medium">已选择</div>
              <div className="mt-2 break-words">{selectedText}</div>
              {selected?.value ? <div className="mt-1 text-slate-500 dark:text-slate-400">ID：{String(selected.value)}</div> : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function loadAliases(key: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const obj = JSON.parse(raw) as Record<string, string>;
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function saveAliases(key: string, v: Record<string, string>) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}

function autoAlias(name: string): string {
  const s = String(name || "").trim();
  if (!s) return "";
  if (/[一-龥]/.test(s)) return s;

  const lower = s.toLowerCase().replace(/\s+/g, " ").trim();
  const direct: Record<string, string> = {
    shoes: "鞋",
    "sports shoes": "运动鞋",
    "work shoes": "工作鞋",
    "everyday shoes": "休闲鞋",
    "household chemicals": "家用清洁",
    "air fresheners": "空气清新",
    "detergents & cleaning agents": "清洁用品",
    "pest repellent": "驱虫用品",
    "construction & renovation": "建材装修",
    "garden & cottage": "园艺户外",
    "home & kitchen": "家居厨房",
    "sports & outdoors": "运动户外",
    "beauty & health": "美妆健康",
    "clothing & shoes": "服装鞋靴",
    "stationery": "文具",
    "office supplies": "办公用品",
    "musical instruments": "乐器",
    "auto goods": "汽车用品",
    "children's goods": "母婴儿童",
    "pet supplies": "宠物用品",
    electronics: "数码电子",

    "галантерея и аксессуары": "饰品配件",
    аксессуары: "配件",
    "аксессуары для волос": "发饰",
    "аксессуары для одежды и обуви": "服装鞋配件",
    бижутерные: "饰品",
    украшения: "饰品",
    аптека: "药房",
    "продукты питания": "食品",
    консервы: "罐头",
    "хлеб и кондитерские изделия": "面包烘焙",
    "соль, сахар, специи": "调味品",
    "макароны, крупы, мука": "粮油干货",
    "безалкогольное пиво": "无酒精啤酒",
    "детское питание": "婴幼儿食品",
    "товары для курения": "烟具",
    "товары для курения и аксессуары": "烟具配件",
    "электронные сигареты и системы нагревания": "电子烟",
    "инструменты для творчества": "手工工具",
  };
  if (direct[lower]) return direct[lower];

  const words = lower.match(/[a-z\u0400-\u04ff]+/g) || [];
  const map: Record<string, string> = {
    construction: "建材",
    renovation: "装修",
    home: "家居",
    kitchen: "厨房",
    garden: "园艺",
    cottage: "户外",
    sports: "运动",
    sport: "运动",
    outdoors: "户外",
    beauty: "美妆",
    health: "健康",
    clothing: "服装",
    clothes: "服装",
    shoes: "鞋",
    shoe: "鞋",
    accessories: "配件",
    accessory: "配件",
    electronics: "电子",
    audio: "音频",
    video: "视频",
    mobile: "手机",
    phone: "手机",
    phones: "手机",
    computers: "电脑",
    computer: "电脑",
    office: "办公",
    stationery: "文具",
    supplies: "用品",
    tools: "工具",
    instrument: "乐器",
    instruments: "乐器",
    toys: "玩具",
    children: "儿童",
    kids: "儿童",
    pet: "宠物",
    pets: "宠物",
    auto: "汽车",
    car: "汽车",
    cars: "汽车",

    household: "家用",
    chemicals: "清洁",
    air: "空气",
    fresheners: "清新",
    detergents: "清洁剂",
    cleaning: "清洁",
    agents: "用品",
    pest: "害虫",
    repellent: "驱虫",
    work: "工作",
    everyday: "日常",
    hair: "头发",
    food: "食品",
    musical: "音乐",
    music: "音乐",

    товары: "",
    для: "",
    и: "",
    аксессуары: "配件",
    украшения: "饰品",
    бижутерные: "饰品",
    волосы: "头发",
    волос: "头发",
    одежда: "服装",
    одежды: "服装",
    обувь: "鞋",
    обуви: "鞋",
    спортивная: "运动",
    спортивные: "运动",
    рабочая: "工作",
    повседневная: "日常",
    детская: "儿童",
    электронные: "电子",
    сигареты: "烟",
    системы: "系统",
    нагревания: "加热",
    продукты: "食品",
    питания: "食品",
    инструменты: "工具",
    творчества: "手工",
    консервы: "罐头",
    хлеб: "面包",
    кондитерские: "烘焙",
    изделия: "制品",
    соль: "盐",
    сахар: "糖",
    специи: "香料",
    макароны: "意面",
    крупы: "谷物",
    мука: "面粉",
    безалкогольное: "无酒精",
    пиво: "啤酒",
    детское: "儿童",
  };

  const translated = words
    .map((w) => map[w] ?? "")
    .filter(Boolean)
    .slice(0, 6)
    .join("");

  if (translated) return translated;
  return "";
}

function isAutoPlaceholder(v: string): boolean {
  const s = String(v || "").trim();
  if (!s) return true;
  return s === "其它" || s === "商品";
}

function ImportTaskInspector() {
  const [taskIds, setTaskIds] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const list = useMemo(
    () =>
      taskIds
        .split(/\r?\n/g)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 20),
    [taskIds],
  );

  const stats = useMemo(() => {
    const total = rows.length;
    const withErrors = rows.filter((r) => Number(r.errors_count || 0) > 0).length;
    const suspectedDup = rows.filter((r) => String(r.duplicate || "").toLowerCase() === "yes").length;
    return { total, withErrors, suspectedDup };
  }, [rows]);

  async function run() {
    setLoading(true);
    setErr(null);
    setRows([]);
    try {
      const results = await Promise.all(
        list.map(async (id) => {
          const n = Number(id);
          const body = Number.isFinite(n) ? { task_id: n } : { task_id: id };
          const r = await apiPost<unknown>("/ozon/products/import/info", body);
          if (r.ok === false) throw new Error(r.raw || r.error);
          return { task_id: id, data: r.data };
        }),
      );

      const out: Row[] = [];
      for (const r of results) {
        const items = extractImportInfoItems(r.data);
        if (!items.length) {
          out.push({ task_id: r.task_id, status: guessAnyStatus(r.data), errors_count: 0, duplicate: "—", message: "未解析到条目（可能任务还在处理或返回结构变化）" });
          continue;
        }
        for (const it of items) {
          const { errors, errorsCount, duplicate } = summarizeItemErrors(it);
          out.push({
            task_id: r.task_id,
            offer_id: pickString(it, ["offer_id", "offerId", "offerid"]),
            product_id: pickString(it, ["product_id", "productId", "id", "sku"]),
            status: pickString(it, ["status", "state", "result", "state_name", "status_name"]) || guessAnyStatus(it),
            errors_count: errorsCount,
            duplicate: duplicate ? "yes" : "no",
            message: errors || "—",
          });
        }
      }
      setRows(out);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel
      title="上品任务诊断（定位重复/失败原因）"
      subtitle="上品返回 task_id 后，用这里查询任务明细。它更贴近“上传时提示重复但店铺里还看不到”的真实场景。"
      right={
        <button
          type="button"
          onClick={() => void run()}
          className="inline-flex items-center gap-2 rounded-lg bg-azure-600 px-3 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-azure-500 active:scale-[0.98] disabled:opacity-60"
          disabled={loading || !list.length}
        >
          {loading ? "查询中…" : "查询任务"}
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <TextareaField
            label="task_id 列表"
            value={taskIds}
            onChange={setTaskIds}
            placeholder="每行一个 task_id（/v3/product/import 返回的任务号）"
            hint="最多 20 条"
            rows={6}
          />
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-[12px] text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">条目</div>
              <div className="mt-1 text-[18px] font-semibold">{String(stats.total)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-[12px] text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">有错误</div>
              <div className="mt-1 text-[18px] font-semibold">{String(stats.withErrors)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-[12px] text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">疑似重复</div>
              <div className="mt-1 text-[18px] font-semibold">{String(stats.suspectedDup)}</div>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {err ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {err}
            </div>
          ) : null}
          <DataTable
            rows={rows}
            columns={["task_id", "offer_id", "product_id", "status", "errors_count", "duplicate", "message"]}
            emptyText={loading ? "加载中…" : "暂无数据"}
          />
        </div>
      </div>
    </Panel>
  );
}

function DuplicateCheck() {
  const [offerIds, setOfferIds] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const list = useMemo(
    () =>
      offerIds
        .split(/\r?\n/g)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 1000),
    [offerIds],
  );

  async function run() {
    setLoading(true);
    setErr(null);
    setRows([]);
    try {
      const body = { offer_id: list, sku: [], product_id: [] };
      const r = await apiPost<unknown>("/ozon/products/info/list", body);
      if (r.ok === false) {
        setErr(r.raw || r.error);
        return;
      }
      const found = extractArray(r.data);
      setRows(
        found.map((x) => ({
          offer_id: (x as any).offer_id,
          product_id: (x as any).id,
          name: (x as any).name,
          barcode: (x as any).barcode,
          price: (x as any).price,
          state_name: (x as any)?.status?.state_name,
          moderate_status: (x as any)?.status?.moderate_status,
        })),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel
      title="商品重复检测"
      subtitle="只覆盖“offer_id 已在店铺商品里存在”的重复。若是上品阶段提示重复但列表里找不到，请用上面的“上品任务诊断”。"
      right={
        <button
          type="button"
          onClick={() => void run()}
          className="inline-flex items-center gap-2 rounded-lg bg-azure-600 px-3 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-azure-500 active:scale-[0.98] disabled:opacity-60"
          disabled={loading || !list.length}
        >
          {loading ? "检测中…" : "检测重复"}
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <TextareaField
            label="offer_id 列表"
            value={offerIds}
            onChange={setOfferIds}
            placeholder="每行一个 offer_id（卖家自定义商品编码）"
            hint="最多 1000 条"
            rows={6}
          />
          <div className="text-[12px] text-slate-500 dark:text-slate-400">
            使用方式：上品报重复时，把你准备上架的 offer_id 粘贴进来即可定位哪些已存在。
          </div>
        </div>
        <div className="space-y-3">
          {err ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {err}
            </div>
          ) : null}
          <DataTable rows={rows} columns={["offer_id", "product_id", "name", "barcode", "price", "state_name", "moderate_status"]} emptyText={loading ? "加载中…" : "未发现已存在商品"} />
        </div>
      </div>
    </Panel>
  );
}

function extractImportInfoItems(data: unknown): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data !== "object") return [];
  const o: any = data;
  const candidates: unknown[] = [
    o.items,
    o.result,
    o.result?.items,
    o.result?.details,
    o.result?.products,
    o.result?.failed,
    o.result?.rejected,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

function pickString(v: any, keys: string[]): string {
  for (const k of keys) {
    const x = v?.[k];
    if (typeof x === "string" && x.trim()) return x;
    if (typeof x === "number" && Number.isFinite(x)) return String(x);
  }
  return "";
}

function guessAnyStatus(v: any): string {
  const s = pickString(v, ["status", "state", "state_name", "status_name"]);
  if (s) return s;
  const rs = pickString(v?.result, ["status", "state", "state_name", "status_name"]);
  if (rs) return rs;
  return "—";
}

function summarizeItemErrors(item: any): { errors: string; errorsCount: number; duplicate: boolean } {
  const rawCandidates: unknown[] = [
    item?.errors,
    item?.error,
    item?.validation_errors,
    item?.reasons,
    item?.error_list,
    item?.error_details,
    item?.rejected,
    item?.result?.errors,
  ];

  const msgs: string[] = [];
  for (const c of rawCandidates) {
    if (Array.isArray(c)) {
      for (const e of c) {
        const m = summarizeError(e);
        if (m) msgs.push(m);
      }
    } else if (c && typeof c === "object") {
      const m = summarizeError(c);
      if (m) msgs.push(m);
    } else if (typeof c === "string" && c.trim()) {
      msgs.push(c.trim());
    }
  }

  const uniq = Array.from(new Set(msgs)).slice(0, 6);
  const merged = uniq.join("；");
  const duplicate = /duplicate|already exists|exists|重复|уже существует/i.test(merged);
  return { errors: merged, errorsCount: msgs.length, duplicate };
}

function summarizeError(e: any): string {
  if (!e) return "";
  if (typeof e === "string") return e.trim();
  if (typeof e !== "object") return "";
  const code = pickString(e, ["code", "error_code", "type"]);
  const msg = pickString(e, ["message", "error", "description", "text"]);
  const field = pickString(e, ["field", "parameter", "attribute_id", "attributeId"]);
  const parts = [code, field, msg].filter(Boolean);
  return parts.join(" ");
}
