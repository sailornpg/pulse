import { useState, useRef, useEffect } from "react";
import { useChat } from "ai/react";
import { useAuth } from "../contexts/AuthContext";
import { API_URL } from "../lib/supabase";
import { Sidebar } from "../components/chat/Sidebar";
import { ChatHeader } from "../components/chat/ChatHeader";
import { MessageList } from "../components/chat/MessageList";
import { ChatInput } from "../components/chat/ChatInput";
import { AgentSettings } from "../components/AgentSettings";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Conversation } from "../types/chat";

export default function HomePage() {
  const { user, token, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    isLoading,
    error,
  } = useChat({
    api: `${API_URL}/chat`,
    body: { conversationId: currentConversationId },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    initialInput: "",
    onFinish: async (message) => {
      if (message.role === "assistant" && !currentConversationId) {
        const convs = await loadConversations();
        if (convs.length > 0) {
          setCurrentConversationId(convs[0].id);
        }
      }
    },
    onError: (error) => {
      console.error("[useChat] error:", error);
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const loadConversations = async () => {
    if (!token) return [];
    setIsLoadingConversations(true);
    try {
      const res = await fetch(`${API_URL}/history/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        return data;
      }
      return [];
    } catch (err) {
      console.error("加载会话失败:", err);
      return [];
    } finally {
      setIsLoadingConversations(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadConversations();
    }
  }, [token]);

  const loadMessages = async (conversationId: string) => {
    if (!token) return;
    setIsLoadingMessages(true);
    try {
      const res = await fetch(
        `${API_URL}/history/conversations/${conversationId}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        const formattedMessages = data.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content || "",
          parts: msg.parts,
        }));
        setMessages(formattedMessages);
        setCurrentConversationId(conversationId);
      }
    } catch (err) {
      console.error("加载消息失败:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
  };

  const handleSelectConversation = (conv: Conversation) => {
    if (conv.id === currentConversationId) return;
    setCurrentConversationId(conv.id);
    loadMessages(conv.id);
  };

  const handleDeleteConversation = async (convId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/history/conversations/${convId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        loadConversations();
        if (currentConversationId === convId) {
          handleNewConversation();
        }
      }
    } catch (err) {
      console.error("删除会话失败:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 size={20} className="animate-spin text-emerald-500" />
          <span className="text-sm font-medium">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-emerald-500/10 selection:text-emerald-400">
        <Sidebar
          sidebarCollapsed={sidebarCollapsed}
          token={token}
          user={user}
          conversations={conversations}
          currentConversationId={currentConversationId}
          isLoadingConversations={isLoadingConversations}
          onNewConversation={handleNewConversation}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onLoginClick={() => navigate("/login", { viewTransition: true })}
          onLogout={logout}
        />

        <main className="flex-1 flex flex-col relative bg-background">
          <ChatHeader
            sidebarCollapsed={sidebarCollapsed}
            user={user}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            onOpenSettings={() => setShowSettings(true)}
          />

          <ScrollArea className="flex-1 relative" ref={scrollRef}>
            {isLoadingMessages && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                <div className="flex items-center gap-3 text-muted-foreground px-4 py-3 rounded-xl">
                  <Loader2
                    className="animate-spin text-emerald-500"
                    size={18}
                  />
                  <span className="text-sm font-medium">加载中...</span>
                </div>
              </div>
            )}
            <div className="mx-auto px-6 py-12 space-y-10 max-w-5xl">
              <MessageList
                messages={messages}
                isLoading={isLoading}
                isLoadingMessages={isLoadingMessages}
              />
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  错误: {error.message || String(error)}
                </div>
              )}
            </div>
          </ScrollArea>

          <ChatInput
            input={input}
            isLoading={isLoading}
            isLoadingMessages={isLoadingMessages}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
          />
        </main>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <AgentSettings
            userId={user?.id || null}
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}
    </>
  );
}
