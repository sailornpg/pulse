import { LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SettingsTab, SettingsTabId } from "./types";

interface SettingsNavProps {
  tabs: SettingsTab[];
  activeTab: SettingsTabId;
  onChange: (tab: SettingsTabId) => void;
  showLogout: boolean;
  onLogout: () => void | Promise<void>;
}

export function SettingsNav({
  tabs,
  activeTab,
  onChange,
  showLogout,
  onLogout,
}: SettingsNavProps) {
  return (
    <aside className="w-full border-b border-border bg-muted/20 p-4 md:w-64 md:border-b-0 md:border-r">
      <div className="mb-4 flex items-center gap-2 px-2">
        <Settings className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-bold uppercase tracking-wider text-foreground/80">
          设置中心
        </span>
      </div>

      <nav className="grid gap-1 md:block">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors mb-2",
              activeTab === tab.id
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <tab.icon
              className={cn(
                "h-4 w-4 shrink-0",
                activeTab === tab.id
                  ? "text-emerald-500"
                  : "text-muted-foreground",
              )}
            />
            <span className="truncate font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>

      {showLogout ? (
        <div className="mt-4 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => void onLogout()}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            退出账号
          </button>
        </div>
      ) : null}
    </aside>
  );
}
