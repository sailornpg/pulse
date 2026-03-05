import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PanelLeftClose, PanelLeft, Brain, Layout } from "lucide-react";
import type { User } from "../../types/chat";

interface ChatHeaderProps {
  sidebarCollapsed: boolean;
  user: User | null;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
}

export function ChatHeader({
  sidebarCollapsed,
  user,
  onToggleSidebar,
  onOpenSettings,
}: ChatHeaderProps) {
  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-4 bg-background z-20">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            onClick={onToggleSidebar}
          >
            {sidebarCollapsed ? (
              <PanelLeft size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex -space-x-1.5">
          {[1, 2].map((i) => (
            <Avatar
              key={i}
              className="h-6 w-6 border-2 border-background ring-1 ring-border"
            >
              <AvatarFallback
                className={`text-[10px] font-bold ${i === 1 ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"}`}
              >
                {i === 1 ? "T" : "M"}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <Separator orientation="vertical" className="h-4 bg-border" />
        {user && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={onOpenSettings}
            title="AI 记忆设置"
          >
            <Brain size={18} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <Layout size={18} />
        </Button>
      </div>
    </header>
  );
}
