import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import KeyValueView from "@/components/KeyValueView";
import StatCard from "@/components/StatCard";
import { apiGet } from "@/utils/api";
import { useAsync } from "@/hooks/useAsync";
import { useMemo, useState } from "react";
import Tabs from "@/components/Tabs";

export default function Settings() {
  const [tab, setTab] = useState<"seller" | "notify">("seller");
  const status = useAsync(async () => {
    const r = await apiGet<any>("/ozon/status");
    if (r.ok === false) throw new Error(r.raw || r.error);
    return r.data;
  }, []);

  const seller = useAsync(async () => {
    const r = await apiGet<any>("/ozon/seller");
    if (r.ok === false) throw new Error(r.raw || r.error);
    return r.data;
  }, []);

  const notify = useAsync(async () => {
    const r = await apiGet<any>("/ozon/notification/list");
    if (r.ok === false) throw new Error(r.raw || r.error);
    return r.data;
  }, []);

  const expires = useMemo(() => {
    const v = status.data?.expires_at;
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleString();
  }, [status.data?.expires_at]);

  return (
    <AppShell
      onRefresh={() => {
        void status.run();
        void seller.run();
        void notify.run();
      }}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard title="密钥状态" value={status.loading ? "加载中" : status.data?.ok ? "可用" : "异常"} hint="来自 /ozon/status" tone="blue" />
        <StatCard title="到期时间" value={expires} hint="expires_at" tone="dark" />
        <StatCard title="可用接口数" value={String(status.data?.method_count ?? "—")} hint="method_count" tone="white" />
      </div>

      <div className="mt-6 space-y-4">
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as any)}
          items={[
            { value: "seller", label: "店铺主体" },
            { value: "notify", label: "通知回调" },
          ]}
        />

        {tab === "seller" ? (
          <Panel title="店铺主体信息" subtitle="用于核对当前账号绑定主体是否正确。">
          {seller.error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {seller.error}
            </div>
          ) : null}
          <div className="mt-4">
            <KeyValueView value={seller.data} />
          </div>
          </Panel>
        ) : null}

        {tab === "notify" ? (
          <Panel title="通知回调" subtitle="当前仅展示已配置回调地址列表。">
          {notify.error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {notify.error}
            </div>
          ) : null}
          <div className="mt-4">
            <KeyValueView value={notify.data} />
          </div>
          </Panel>
        ) : null}
      </div>
    </AppShell>
  );
}
