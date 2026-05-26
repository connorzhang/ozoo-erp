import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import Field from "@/components/Field";
import DataTable from "@/components/DataTable";
import StatCard from "@/components/StatCard";
import { apiGet } from "@/utils/api";
import { useAsync } from "@/hooks/useAsync";
import { getMethodMeta } from "@/utils/methodMeta";

type RolesResponse = {
  expires_at?: string;
  roles?: { name?: string; methods?: string[] }[];
};

export default function Capabilities() {
  const roles = useAsync(async () => {
    const r = await apiGet<RolesResponse>("/ozon/roles");
    if (r.ok === false) throw new Error(r.raw || r.error);
    return r.data;
  }, []);

  const [q, setQ] = useState("");

  const methods = useMemo(() => {
    const list: { group: string; title: string; note: string; role: string; method: string }[] = [];
    for (const r of roles.data?.roles ?? []) {
      for (const m of r.methods ?? []) {
        const meta = getMethodMeta(m);
        list.push({
          group: meta?.group ?? "其它",
          title: meta?.title ?? "—",
          note: meta?.note ?? "",
          role: r.name || "-",
          method: m,
        });
      }
    }
    list.sort((a, b) => {
      const g = a.group.localeCompare(b.group, "zh-Hans-CN");
      if (g) return g;
      const t = a.title.localeCompare(b.title, "zh-Hans-CN");
      if (t) return t;
      return a.method.localeCompare(b.method);
    });
    if (!q.trim()) return list;
    const s = q.trim().toLowerCase();
    return list.filter(
      (x) =>
        x.method.toLowerCase().includes(s) ||
        x.role.toLowerCase().includes(s) ||
        x.group.toLowerCase().includes(s) ||
        x.title.toLowerCase().includes(s),
    );
  }, [roles.data?.roles, q]);

  const expires = useMemo(() => {
    const v = roles.data?.expires_at;
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleString();
  }, [roles.data?.expires_at]);

  return (
    <AppShell onRefresh={() => void roles.run()}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard title="密钥到期" value={expires} hint="来自 /v1/roles" tone="dark" />
        <StatCard title="角色数量" value={String(roles.data?.roles?.length ?? "—")} hint="roles[]" tone="white" />
        <StatCard title="接口条目" value={String(methods.length)} hint="methods[]" tone="blue" />
      </div>

      <div className="mt-6 space-y-6">
        <Panel
          title="接口列表"
          subtitle="这里展示你当前密钥允许调用的接口路径。不是 JSON 调试页，直接用于权限确认与功能范围梳理。"
          right={
            <div className="w-[320px]">
              <Field label="搜索" value={q} onChange={setQ} placeholder="/v3/product/list" />
            </div>
          }
        >
          {roles.error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {roles.error}
            </div>
          ) : null}
          <DataTable
            rows={methods}
            columns={["group", "title", "note", "role", "method"]}
            emptyText={roles.loading ? "加载中…" : "暂无数据"}
            className="mt-4"
          />
        </Panel>
      </div>
    </AppShell>
  );
}

