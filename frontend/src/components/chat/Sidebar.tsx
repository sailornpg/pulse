import {
  Plus,
  MessageSquare,
  LogIn,
  LogOut,
  Settings,
  Sparkles,
  MoreHorizontal,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Conversation, User } from "../../types/chat";
import SettingsDialog from "../Settings";

interface SidebarProps {
  sidebarCollapsed: boolean;
  token: string | null;
  user: User | null;
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoadingConversations: boolean;
  onNewConversation: () => void;
  onSelectConversation: (conv: Conversation) => void;
  onDeleteConversation: (convId: string) => void;
  onLoginClick: () => void;
  onLogout: () => void;
}

export function Sidebar({
  sidebarCollapsed,
  token,
  user,
  conversations,
  currentConversationId,
  isLoadingConversations,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onLoginClick,
  onLogout,
}: SidebarProps) {
  const getUserInitial = (email: string) => email.charAt(0).toUpperCase();
  const getUserName = (email: string) => email.split("@")[0];

  return (
    <aside
      className={`bg-background border-r border-border flex flex-col hidden md:flex shrink-0 transition-all duration-300 ${sidebarCollapsed ? "w-0 overflow-hidden" : "w-72"}`}
    >
      {!sidebarCollapsed && (
        <div className="flex items-center gap-2 px-3 pt-5">
          <div
            className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20"
            style={{ viewTransitionName: "app-logo" }}
          >
            <Sparkles size={16} className="text-emerald-500" />
          </div>
          <h1 className="text-sm font-bold tracking-tight text-foreground font-mono">
            PULSE AI
          </h1>
          <Badge
            variant="outline"
            className="text-[10px] font-mono border-border text-muted-foreground px-2 py-0"
          >
            v2.5.0
          </Badge>
        </div>
      )}
      <div className="px-3 my-4">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 h-11 rounded-xl border-border bg-muted/50 hover:bg-muted hover:border-accent text-muted-foreground transition-all duration-200 group"
          onClick={onNewConversation}
        >
          <Plus
            size={16}
            className="text-muted-foreground group-hover:text-emerald-500 transition-colors"
          />
          {!sidebarCollapsed && <span className="font-medium">新对话</span>}
        </Button>
      </div>

      {!sidebarCollapsed && (
        <ScrollArea className="flex-1 px-3 w-full">
          <div className="px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4 mt-2">
            我的会话
          </div>
          {isLoadingConversations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2
                size={16}
                className="animate-spin text-muted-foreground"
              />
            </div>
          ) : token ? (
            <div className="space-y-1 w-full">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center justify-between w-64 h-11 px-3 rounded-lg font-normal transition-all duration-200 overflow-hidden ${currentConversationId === conv.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"}`}
                  onClick={() => onSelectConversation(conv)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <MessageSquare
                      size={14}
                      className={
                        currentConversationId === conv.id
                          ? "text-emerald-500 shrink-0"
                          : "text-muted-foreground/60 group-hover:text-emerald-500/70 shrink-0"
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <span className="block truncate">{conv.title}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground/60 transition-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        className="text-red-400 focus:text-red-400 cursor-pointer"
                        onClick={() => onDeleteConversation(conv.id)}
                      >
                        <Trash2 size={14} className="mr-2" />
                        删除会话
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              {conversations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  暂无会话记录
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              登录后可查看历史记录
            </div>
          )}
        </ScrollArea>
      )}

      <div className="p-4 mt-auto">
        {token && user ? (
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl border border-border hover:border-accent transition-colors group">
            <Avatar className="h-10 w-10 border border-border group-hover:border-emerald-500/30 transition-colors">
              <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                {getUserInitial(user.email)}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground/90 truncate group-hover:text-foreground">
                    {getUserName(user.email)}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium truncate">
                    {user.email}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground/60 hover:text-foreground hover:bg-muted"
                    onClick={onLogout}
                  >
                    <LogOut size={14} />
                  </Button>
                  <SettingsDialog></SettingsDialog>
                </div>
              </>
            )}
          </div>
        ) : !sidebarCollapsed ? (
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-11 rounded-xl border-border bg-muted/50 hover:bg-muted hover:border-accent text-muted-foreground transition-all duration-200"
            onClick={onLoginClick}
          >
            <LogIn size={16} className="text-muted-foreground" />
            <span className="font-medium">登录</span>
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
