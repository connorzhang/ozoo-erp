import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Moon, RefreshCw, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const titleMap: Record<string, string> = {
  "/": "总览仪表盘",
  "/capabilities": "接口能力",
  "/selection": "智能选品（信号）",
  "/listing": "上品中心",
  "/pricing": "定价 & 利润",
  "/orders": "订单履约",
  "/returns": "售后退货",
  "/finance": "财务对账",
  "/settings": "设置",
};

export default function TopBar(props: { onRefresh?: () => void }) {
  const { pathname } = useLocation();
  const title = useMemo(() => {
    if (titleMap[pathname]) return titleMap[pathname];
    if (pathname.startsWith("/orders/")) return "订单详情";
    return "控制台";
  }, [pathname]);
  const { isDark, toggleTheme } = useTheme();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/70 px-6 backdrop-blur dark:border-white/10 dark:bg-ink-900/50">
      <div className="min-w-0">
        <div className="text-[12px] text-slate-500 dark:text-slate-400">跨境运营控制台</div>
        <div className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">{title}</div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300 md:block">
          {now.toLocaleString()}
        </div>

        <button
          type="button"
          onClick={props.onRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          aria-label="toggle theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
