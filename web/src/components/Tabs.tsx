import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function Tabs<T extends string>(props: {
  value: T;
  onChange: (v: T) => void;
  items: Array<{ value: T; label: string }>;
  className?: string;
  right?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", props.className)}>
      <div className="flex flex-wrap gap-2">
        {props.items.map((it) => (
          <button
            key={it.value}
            type="button"
            onClick={() => props.onChange(it.value)}
            className={cn(
              "rounded-xl px-4 py-2 text-[12px] font-medium shadow-sm transition active:scale-[0.98]",
              it.value === props.value
                ? "bg-azure-600 text-white"
                : "border border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
            )}
          >
            {it.label}
          </button>
        ))}
      </div>
      {props.right ? <div className="shrink-0">{props.right}</div> : null}
    </div>
  );
}

