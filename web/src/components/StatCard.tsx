import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function StatCard(props: {
  title: string;
  value: ReactNode;
  hint?: string;
  tone?: "blue" | "dark" | "white";
}) {
  const tone = props.tone ?? "blue";

  const toneClass =
    tone === "blue"
      ? "bg-gradient-to-r from-azure-600 to-azure-500 text-white shadow-card2"
      : tone === "dark"
        ? "bg-gradient-to-r from-ink-850 to-ink-800 text-slate-100 shadow-card"
        : "bg-white text-slate-900 shadow-card dark:bg-white/5 dark:text-slate-100";

  return (
    <div className={cn("rounded-2xl p-4 ring-1 ring-black/5 dark:ring-white/10", toneClass)}>
      <div className="text-[12px] opacity-90">{props.title}</div>
      <div className="mt-2 text-[22px] font-semibold leading-none">{props.value}</div>
      {props.hint ? <div className="mt-2 text-[11px] opacity-85">{props.hint}</div> : null}
    </div>
  );
}

