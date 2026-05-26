import { NavLink } from "react-router-dom";
import {
  Activity,
  Banknote,
  Boxes,
  Calculator,
  Compass,
  PackageCheck,
  Settings,
  Sparkles,
  Wrench,
} from "lucide-react";

const items = [
  { to: "/", label: "总览", Icon: Activity },
  { to: "/capabilities", label: "接口能力", Icon: Wrench },
  { to: "/selection", label: "智能选品", Icon: Sparkles },
  { to: "/listing", label: "上品中心", Icon: Boxes },
  { to: "/pricing", label: "定价&利润", Icon: Calculator },
  { to: "/orders", label: "订单履约", Icon: PackageCheck },
  { to: "/returns", label: "售后退货", Icon: Compass },
  { to: "/finance", label: "财务对账", Icon: Banknote },
  { to: "/settings", label: "设置", Icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="h-full w-[260px] shrink-0 border-r border-white/10 bg-gradient-to-b from-ink-900 via-ink-900 to-ink-950 text-slate-100">
      <div className="px-5 pt-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-azure-600/20 ring-1 ring-azure-500/30">
            <span className="text-[18px] font-semibold tracking-wide text-azure-400">OZ</span>
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold text-slate-100">OZON-ERP</div>
            <div className="text-[11px] text-slate-400">跨境运营控制台</div>
          </div>
        </div>
      </div>

      <nav className="mt-6 px-3">
        {items.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition",
                isActive
                  ? "bg-white/10 text-white ring-1 ring-white/10"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              ].join(" ")
            }
          >
            <Icon className="h-[18px] w-[18px] opacity-90" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-5 pb-5 pt-6">
        <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
          <div className="text-[11px] text-slate-400">提示</div>
          <div className="mt-1 text-[12px] text-slate-200">
            前端不保存密钥，所有调用都走本地后端代理。
          </div>
        </div>
      </div>
    </aside>
  );
}
