import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import DataTable from "@/components/DataTable";
import KeyValueView from "@/components/KeyValueView";
import { apiPost } from "@/utils/api";
import { useAsync } from "@/hooks/useAsync";
import { extractArray, type Row } from "@/utils/extract";

export default function OrderDetail() {
  const nav = useNavigate();
  const { postingNumber } = useParams();
  const posting_number = decodeURIComponent(String(postingNumber || ""));

  const detail = useAsync(async () => {
    if (!posting_number) throw new Error("缺少 posting_number");
    const r = await apiPost<any>("/ozon/posting/fbs/get", {
      posting_number,
      with: { analytics_data: true, financial_data: true, barcodes: true, translit: true },
    });
    if (r.ok === false) throw new Error(r.raw || r.error);
    return r.data;
  }, [posting_number]);

  const result = (detail.data as any)?.result ?? detail.data;
  const products = useMemo(() => extractArray(result?.products), [result]);

  const summary = useMemo(() => {
    const r = result || {};
    return {
      posting_number: r.posting_number,
      order_number: r.order_number,
      order_id: r.order_id,
      status: r.status,
      substatus: r.substatus,
      shipment_date: r.shipment_date,
      delivering_date: r.delivering_date,
      tracking_number: r.tracking_number,
      delivery_method: r.delivery_method?.name,
    };
  }, [result]);

  const address = useMemo(() => {
    const a = result?.customer?.address || {};
    return {
      name: result?.customer?.name,
      phone: result?.customer?.phone,
      country: a.country,
      region: a.region,
      city: a.city,
      district: a.district,
      zip_code: a.zip_code,
      address_tail: a.address_tail,
      comment: a.comment,
    };
  }, [result]);

  const delivery = useMemo(() => {
    const d = result?.delivery_method || {};
    return {
      name: d.name,
      warehouse: d.warehouse,
      tpl_provider: d.tpl_provider,
      tpl_integration_type: result?.tpl_integration_type,
    };
  }, [result]);

  const productRows = useMemo(() => {
    return products.map((p) => ({
      offer_id: (p as any).offer_id,
      name: (p as any).name,
      sku: (p as any).sku,
      quantity: (p as any).quantity,
      price: (p as any).price,
      currency_code: (p as any).currency_code,
    }));
  }, [products]);

  return (
    <AppShell onRefresh={() => void detail.run()}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[12px] text-slate-500 dark:text-slate-400">订单履约</div>
            <div className="truncate text-[16px] font-semibold text-slate-900 dark:text-slate-100">
              订单详情：{posting_number || "—"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => nav("/orders")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            返回列表
          </button>
        </div>

        {detail.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            {detail.error}
          </div>
        ) : null}

        <Panel title="概览" subtitle="发货单/订单核心信息">
          {detail.loading ? <div className="text-[12px] text-slate-500 dark:text-slate-400">加载中…</div> : null}
          {!detail.loading && result ? <KeyValueView value={summary} maxDepth={3} /> : null}
        </Panel>

        <Panel title="收货信息" subtitle="买家与地址（如接口返回为空则表示平台未提供）">
          {!detail.loading && result ? <KeyValueView value={address} maxDepth={3} /> : null}
        </Panel>

        <Panel title="物流信息" subtitle="配送方式与仓库/承运商">
          {!detail.loading && result ? <KeyValueView value={delivery} maxDepth={3} /> : null}
        </Panel>

        <Panel title="商品明细" subtitle="该发货单内的商品列表">
          <DataTable
            rows={productRows as Row[]}
            columns={["offer_id", "name", "sku", "quantity", "price", "currency_code"]}
            emptyText={detail.loading ? "加载中…" : "暂无数据"}
          />
        </Panel>

        <Panel title="完整字段" subtitle="用于排查问题（以键值形式展示，不显示 JSON）">
          {!detail.loading && result ? <KeyValueView value={detail.data} maxDepth={4} /> : null}
        </Panel>
      </div>
    </AppShell>
  );
}

