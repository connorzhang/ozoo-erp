import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import { apiPost } from "@/utils/api";

type PricingCalcResponse = {
  total_cost: number;
  break_even_price: number;
  recommended_price: number;
  promotion_floor_price: number;
  assumed_total_fee_rate: number;
};

export default function Pricing() {
  const [form, setForm] = useState({
    cost_goods: 10,
    cost_first_mile: 2,
    cost_last_mile: 3,
    cost_packaging: 1,
    cost_other: 0.5,
    target_profit: 5,
    platform_fee_rate: 0.15,
    payment_fee_rate: 0.02,
    tax_rate: 0,
    rounding: 1,
    min_price: 0,
    promotion_discount_pct: 10,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<PricingCalcResponse | null>(null);

  const totalRatePct = useMemo(() => ((form.platform_fee_rate + form.payment_fee_rate + form.tax_rate) * 100).toFixed(2), [form]);

  async function calc() {
    setLoading(true);
    setError(null);
    try {
      const r = await apiPost<PricingCalcResponse>("/pricing/calc", form);
      if (r.ok === false) throw new Error(r.raw || r.error);
      setResp(r.data);
    } catch (e) {
      setResp(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell onRefresh={() => void calc()}>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel
          title="成本与费率"
          subtitle="先用可控的成本模型跑通闭环；运费/类目限制后续接入可选物流试算。"
          right={
            <button
              type="button"
              onClick={() => void calc()}
              className="inline-flex items-center gap-2 rounded-lg bg-azure-600 px-3 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-azure-500 active:scale-[0.98] disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "计算中…" : "计算建议售价"}
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="采购成本" value={form.cost_goods} onChange={(v) => setForm({ ...form, cost_goods: v })} />
            <Field label="目标利润" value={form.target_profit} onChange={(v) => setForm({ ...form, target_profit: v })} />
            <Field label="头程成本" value={form.cost_first_mile} onChange={(v) => setForm({ ...form, cost_first_mile: v })} />
            <Field label="尾程成本" value={form.cost_last_mile} onChange={(v) => setForm({ ...form, cost_last_mile: v })} />
            <Field label="包材" value={form.cost_packaging} onChange={(v) => setForm({ ...form, cost_packaging: v })} />
            <Field label="其它成本" value={form.cost_other} onChange={(v) => setForm({ ...form, cost_other: v })} />
            <Field label="平台费率" value={form.platform_fee_rate} step={0.01} onChange={(v) => setForm({ ...form, platform_fee_rate: v })} hint="0.15 = 15%" />
            <Field label="支付费率" value={form.payment_fee_rate} step={0.01} onChange={(v) => setForm({ ...form, payment_fee_rate: v })} hint="0.02 = 2%" />
            <Field label="税率" value={form.tax_rate} step={0.01} onChange={(v) => setForm({ ...form, tax_rate: v })} hint="0.00 = 0%" />
            <Field label="最小售价" value={form.min_price} onChange={(v) => setForm({ ...form, min_price: v })} />
            <Field label="取整步长" value={form.rounding} onChange={(v) => setForm({ ...form, rounding: v })} hint="1 表示向上取整到 1 元" />
            <Field label="促销折扣(%)" value={form.promotion_discount_pct} onChange={(v) => setForm({ ...form, promotion_discount_pct: v })} />
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            假设总费率：{totalRatePct}%（平台 + 支付 + 税）
          </div>
        </Panel>

        <Panel title="结果" subtitle="输出保本价、建议售价、促销底价（按折扣回推）。">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Result label="总成本" value={resp?.total_cost} />
            <Result label="保本价" value={resp?.break_even_price} />
            <Result label="建议售价" value={resp?.recommended_price} tone="blue" />
            <Result label="促销底价" value={resp?.promotion_floor_price} />
          </div>

          <div className="mt-4 text-[12px] text-slate-500 dark:text-slate-400">
            说明：当前运费先用成本项模拟；待“可选物流 + 运费试算”参数确认后再接入实时试算。
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function Field(props: { label: string; value: number; step?: number; hint?: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-[12px] font-medium text-slate-700 dark:text-slate-200">{props.label}</div>
        {props.hint ? <div className="text-[11px] text-slate-500 dark:text-slate-400">{props.hint}</div> : null}
      </div>
      <input
        type="number"
        step={props.step ?? 0.1}
        value={Number.isFinite(props.value) ? props.value : 0}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-800 shadow-sm outline-none focus:border-azure-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
      />
    </div>
  );
}

function Result(props: { label: string; value?: number; tone?: "blue" }) {
  const tone =
    props.tone === "blue"
      ? "bg-gradient-to-r from-azure-600 to-azure-500 text-white"
      : "bg-white text-slate-900 dark:bg-white/5 dark:text-slate-100";
  return (
    <div className={`rounded-2xl border border-slate-200 p-4 shadow-sm dark:border-white/10 ${tone}`}>
      <div className="text-[12px] opacity-90">{props.label}</div>
      <div className="mt-2 text-[20px] font-semibold">{props.value ?? "—"}</div>
    </div>
  );
}
