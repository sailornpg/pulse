import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Settings, User, Monitor, Shield, Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useTheme } from "@/contexts/ThemeContext";

const SETTINGS_TABS = [
  { id: "general", label: "通用设置", icon: Monitor },
  { id: "account", label: "个人账号", icon: User },
  { id: "security", label: "安全隐私", icon: Shield },
  { id: "notifications", label: "消息通知", icon: Bell },
];

export default function SettingsDialog() {
  const [activeTab, setActiveTab] = useState("general");
  const { theme, setTheme } = useTheme();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <Settings size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[650px] p-0 gap-0 bg-background border-border overflow-hidden flex flex-col md:flex-row">
        {/* 左侧 Aside 导航 */}
        <aside className="w-full md:w-56 border-r border-border bg-muted/20 flex flex-col p-4 gap-2">
          <div className="flex items-center gap-2 px-2 mb-4">
            <Settings className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-bold text-foreground/80 uppercase tracking-wider">
              设置中心
            </span>
          </div>
          <nav className="flex-1 space-y-1">
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  activeTab === tab.id
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                <tab.icon
                  className={cn(
                    "w-4 h-4",
                    activeTab === tab.id
                      ? "text-emerald-500"
                      : "text-muted-foreground",
                  )}
                />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t border-border">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-4 h-4" />
              退出账号
            </button>
          </div>
        </aside>

        {/* 右侧内容区域 */}
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle className="text-foreground text-lg">
              {SETTINGS_TABS.find((t) => t.id === activeTab)?.label}
            </DialogTitle>
            {/* 添加下面这一行 */}
            <DialogDescription className="text-xs text-muted-foreground">
              在这里调整您的个性化设置和偏好。
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 text-muted-foreground space-y-6">
            {activeTab === "general" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-border bg-accent/10">
                  <h3 className="text-foreground font-medium mb-1">主题设置</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    切换系统的视觉风格
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      className="px-4"
                      onClick={() => setTheme("dark")}
                    >
                      深色模式
                    </Button>
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      className="px-4 border-border"
                      onClick={() => setTheme("light")}
                    >
                      浅色模式
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      size="sm"
                      className="px-4 border-border text-muted-foreground"
                      onClick={() => setTheme("system")}
                    >
                      跟随系统
                    </Button>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-accent/10">
                  <h3 className="text-foreground font-medium mb-1">语言偏好</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    选择你熟悉的语言
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-4 border-border"
                  >
                    简体中文 (默认)
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "account" && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 rounded-full bg-accent border border-border flex items-center justify-center mb-4">
                  <User size={40} className="text-muted-foreground" />
                </div>
                <h3 className="text-foreground font-medium font-mono">
                  USER@PULSE.AI
                </h3>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  脉冲会员 · 终身版
                </p>
              </div>
            )}

            {activeTab !== "general" && activeTab !== "account" && (
              <div className="flex flex-col items-center justify-center h-full opacity-30 select-none grayscale">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-border mb-4" />
                <p className="text-sm font-mono tracking-tighter">
                  FEATURE UNDER DEVELOPMENT
                </p>
              </div>
            )}
          </div>
        </main>
      </DialogContent>
    </Dialog>
  );
}
