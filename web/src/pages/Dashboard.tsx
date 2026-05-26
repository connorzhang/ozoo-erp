import { useMemo } from "react";
import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import StatCard from "@/components/StatCard";
import { apiGet } from "@/utils/api";
import { useAsync } from "@/hooks/useAsync";
import { ArrowRight, BadgeCheck, Clock, KeyRound, Network } from "lucide-react";
import { Link } from "react-router-dom";

type OzonStatus = {
  ok: boolean;
  expires_at: string;
  roles: string[];
  method_count: number;
};

type SellerInfo = {
  company?: {
    name?: string;
    legal_name?: string;
    currency?: string;
    country?: string;
  };
};

export default function Dashboard() {
  const status = useAsync(async () => {
    const r = await apiGet<OzonStatus>("/ozon/status");
    if (r.ok === false) throw new Error(r.raw || r.error);
    return r.data;
  }, []);

  const seller = useAsync(async () => {
    const r = await apiGet<SellerInfo>("/ozon/seller");
    if (r.ok === false) throw new Error(r.raw || r.error);
    return r.data;
  }, []);

  const expiresHint = useMemo(() => {
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
      }}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <StatCard
          title="密钥状态"
          value={status.loading ? "加载中" : status.data?.ok ? "可用" : "异常"}
          hint={status.error ? "调用失败" : "来自 /ozon/status"}
          tone="blue"
        />
        <StatCard
          title="到期时间"
          value={expiresHint}
          hint="来自 /v1/roles.expires_at"
          tone="dark"
        />
        <StatCard
          title="可用接口数"
          value={status.loading ? "…" : String(status.data?.method_count ?? "—")}
          hint="来自 /v1/roles.methods"
          tone="white"
        />
        <StatCard
          title="店铺主体"
          value={seller.loading ? "…" : seller.data?.company?.name || "—"}
          hint={seller.data?.company?.currency ? `结算币种：${seller.data.company.currency}` : "来自 /v1/seller/info"}
          tone="white"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel
          title="快速入口"
          subtitle="按“API 调试优先”的交付策略，每个模块都能先用可调用的界面跑通闭环。"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <QuickLink
              to="/capabilities"
              title="接口能力"
              desc="查看角色、接口列表与订阅限制提示。"
              Icon={Network}
            />
            <QuickLink
              to="/pricing"
              title="定价 & 利润"
              desc="输入成本/费率/目标利润，输出建议售价与底价。"
              Icon={BadgeCheck}
            />
            <QuickLink
              to="/listing"
              title="上品中心"
              desc="类目树、属性模板、导入任务、价格库存批量同步。"
              Icon={KeyRound}
            />
            <QuickLink
              to="/selection"
              title="智能选品（信号）"
              desc="搜索词与查询表现信号面板，先做“半自动选品”。"
              Icon={Clock}
            />
          </div>
        </Panel>

        <Panel title="当前信息" subtitle="用于确认账号环境是否正确。">
          <div className="space-y-3 text-[13px] text-slate-700 dark:text-slate-200">
            <Row label="角色" value={status.data?.roles?.join(", ") || "—"} />
            <Row label="公司全称" value={seller.data?.company?.legal_name || "—"} />
            <Row label="国家" value={seller.data?.company?.country || "—"} />
            <Row label="最近错误" value={status.error || seller.error || "—"} />
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-slate-500 dark:text-slate-400">{props.label}</div>
      <div className="max-w-[70%] text-right font-medium">{props.value}</div>
    </div>
  );
}

function QuickLink(props: {
  to: string;
  title: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      to={props.to}
      className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-[1px] hover:shadow-card dark:border-white/10 dark:bg-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-azure-600/10 text-azure-600 ring-1 ring-azure-600/20 dark:text-azure-400">
          <props.Icon className="h-5 w-5" />
        </div>
        <ArrowRight className="mt-1 h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
      </div>
      <div className="mt-3 text-[13px] font-semibold text-slate-900 dark:text-slate-100">{props.title}</div>
      <div className="mt-1 text-[12px] leading-5 text-slate-500 dark:text-slate-400">{props.desc}</div>
    </Link>
  );
}
