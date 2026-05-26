import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function Panel(props: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white/80 shadow-card backdrop-blur dark:border-white/10 dark:bg-white/5",
        props.className,
      )}
    >
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{props.title}</div>
          {props.subtitle ? <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{props.subtitle}</div> : null}
        </div>
        {props.right ? <div className="shrink-0">{props.right}</div> : null}
      </header>
      <div className="p-5">{props.children}</div>
    </section>
  );
}

