import { cn } from "@/lib/utils";

export default function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: "text" | "number" | "datetime-local" | "date";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", props.className)}>
      <div className="flex items-end justify-between gap-2">
        <div className="text-[12px] font-medium text-slate-700 dark:text-slate-200">{props.label}</div>
        {props.hint ? <div className="text-[11px] text-slate-500 dark:text-slate-400">{props.hint}</div> : null}
      </div>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-800 shadow-sm outline-none focus:border-azure-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
      />
    </div>
  );
}

export function TextareaField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-[12px] font-medium text-slate-700 dark:text-slate-200">{props.label}</div>
        {props.hint ? <div className="text-[11px] text-slate-500 dark:text-slate-400">{props.hint}</div> : null}
      </div>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        rows={props.rows ?? 4}
        className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-800 shadow-sm outline-none focus:border-azure-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
      />
    </div>
  );
}

