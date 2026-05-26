import { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default function AppShell(props: { children: ReactNode; onRefresh?: () => void }) {
  return (
    <div className="h-full w-full">
      <div className="flex h-full">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onRefresh={props.onRefresh} />
          <main className="min-h-0 flex-1 overflow-auto bg-slate-50 px-6 py-6 dark:bg-ink-950">
            <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.55] dark:opacity-[0.35]">
              <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_10%_0%,rgba(61,139,255,0.20),transparent_70%),radial-gradient(700px_450px_at_85%_10%,rgba(90,160,255,0.14),transparent_70%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.65),rgba(248,250,252,1))] dark:bg-[linear-gradient(to_bottom,rgba(11,18,32,0.9),rgba(11,18,32,1))]" />
            </div>
            {props.children}
          </main>
        </div>
      </div>
    </div>
  );
}

