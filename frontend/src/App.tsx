import { useChat } from 'ai/react';
import type { Message } from 'ai';

import { Terminal, Loader2, Plus, MessageSquare, User, Settings, Layout, Send, Sparkles, Command, LogOut, Trash2, LogIn } from 'lucide-react';
import { ToolRenderer } from './components/ToolRenderer';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, memo, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { API_URL } from './lib/supabase';
import LoginPage from './pages/LoginPage';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
}

const MessageList = memo(function MessageList({ messages, isLoading }: { messages: Message[], isLoading: boolean }) {
  return (
    <>
      <AnimatePresence initial={false}>
        {messages.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10 mb-6">
              <Sparkles size={32} className="text-emerald-500/50" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">有什么我可以帮您的吗？</h2>
            <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">
              我可以帮您分析代码、撰写文档或回答任何技术问题。
            </p>
          </motion.div>
        )}

        {messages.map((m: Message) => (
          <motion.div 
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-5 ${m.role === 'user' ? 'flex-row-reverse max-w-[85%]' : 'w-full'}`}>
              <div className="flex-1 space-y-4 min-w-0">
                {m.role === 'assistant' && (m as any).parts ? (
                  (m as any).parts.map((part: any, i: number) => {
                    if (part.type === 'text') {
                      return (
                        <div key={`text-${i}`} className="text-zinc-200 leading-relaxed prose prose-zinc dark:prose-invert max-w-none">
                          <ReactMarkdown>{part.text}</ReactMarkdown>
                        </div>
                      );
                    }
                    if (part.type === 'tool-invocation') {
                      const ti = part.toolInvocation;
                      return (
                        <div 
                          key={part.toolCallId}
                          className="animate-in fade-in duration-300"
                        >
                          <ToolRenderer 
                            toolName={ti.toolName}
                            toolCallId={ti.toolCallId}
                            state={ti.state === 'result' ? 'result' : 'call'}
                            args={ti.args}
                            result={ti.result}
                          />
                        </div>
                      );
                    }
                    return null;
                  })
                ) : (
                  <>
                    <div className={`prose prose-zinc dark:prose-invert max-w-none ${
                      m.role === 'user' 
                        ? 'bg-zinc-900 border border-zinc-800 px-5 py-3 rounded-2xl rounded-tr-sm text-zinc-100 shadow-sm' 
                        : 'text-zinc-200 leading-relaxed'
                    }`}>
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                    {m.toolInvocations && (
                      <div className="space-y-3">
                        {m.toolInvocations.map((toolInvocation: any) => (
                          <div key={toolInvocation.toolCallId} className="animate-in fade-in duration-300">
                            <ToolRenderer 
                              toolName={toolInvocation.toolName}
                              toolCallId={toolInvocation.toolCallId}
                              state={toolInvocation.state === 'result' ? 'result' : 'call'}
                              args={toolInvocation.args}
                              result={toolInvocation.result}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {isLoading && (messages.length === 0 || messages[messages.length - 1]?.role !== 'assistant') && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-start"
        >
          <div className="flex items-center gap-3 text-zinc-500 bg-zinc-900/30 px-4 py-2 rounded-xl border border-zinc-900/50">
            <Loader2 className="animate-spin text-emerald-500/60" size={14} />
            <span className="text-xs font-medium tracking-tight">思考中...</span>
          </div>
        </motion.div>
      )}
    </>
  );
});

function ChatApp({ user, token, onLoginClick }: { user: User | null, token: string | null, onLoginClick: () => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => {
    return localStorage.getItem('currentConversationId');
  });
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  useEffect(() => {
    if (currentConversationId) {
      localStorage.setItem('currentConversationId', currentConversationId);
    } else {
      localStorage.removeItem('currentConversationId');
    }
  }, [currentConversationId]);

  const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading } = useChat({
    api: `${API_URL}/chat`,
    body: { conversationId: currentConversationId },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    initialInput: '',
    onFinish: (message) => {
      if (message.role === 'assistant') {
        loadConversations();
      }
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const loadConversations = async () => {
    if (!token) return;
    setIsLoadingConversations(true);
    try {
      const res = await fetch(`${API_URL}/history/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0 && !currentConversationId) {
          setCurrentConversationId(data[0].id);
        }
      }
    } catch (err) {
      console.error("加载会话失败:", err);
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
      const res = await fetch(`${API_URL}/history/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const formattedMessages: Message[] = data.map((msg: any) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content || '',
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
    localStorage.removeItem('currentConversationId');
  };

  const handleSelectConversation = (conv: Conversation) => {
    loadMessages(conv.id);
  };

  const handleDeleteConversation = async (convId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/history/conversations/${convId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        if (currentConversationId === convId) {
          handleNewConversation();
        }
        loadConversations();
      }
    } catch (err) {
      console.error("删除会话失败:", err);
    }
  };

  const { logout } = useAuth();

  const handleSignOut = async () => {
    await logout();
  };

  const getUserInitial = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const getUserName = (email: string) => {
    return email.split('@')[0];
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-foreground overflow-hidden font-sans selection:bg-emerald-500/10 selection:text-emerald-400">
      <aside className="bg-zinc-950 border-r border-zinc-900 flex flex-col hidden md:flex shrink-0">
        <div className="p-6">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 h-11 rounded-xl border-zinc-900 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 transition-all duration-200 group"
            onClick={handleNewConversation}
          >
            <Plus size={16} className="text-zinc-500 group-hover:text-emerald-500 transition-colors" />
            <span className="font-medium">新对话</span>
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3 w-full">
          <div className="px-3 text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-4 mt-2">
            我的会话
          </div>
          {isLoadingConversations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} className="animate-spin text-zinc-600" />
            </div>
          ) : token ? (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div 
                  key={conv.id} 
                  className={`group flex items-center justify-between w-full h-11 px-3 rounded-lg font-normal transition-all duration-200 overflow-hidden ${currentConversationId === conv.id ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50 cursor-pointer'}`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 w-72">
                    <MessageSquare size={14} className={currentConversationId === conv.id ? 'text-emerald-500 shrink-0' : 'text-zinc-600 group-hover:text-emerald-500/70 shrink-0'} />
                    <div className="flex-1 min-w-0">
                      <span className="block truncate">{conv.title}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              {conversations.length === 0 && (
                <div className="text-center py-8 text-zinc-600 text-sm">
                  暂无会话记录
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-600 text-sm">
              登录后可查看历史记录
            </div>
          )}
        </ScrollArea>

        <div className="p-4 mt-auto">
          {token && user ? (
            <div className="flex items-center gap-3 p-3 bg-zinc-900/30 rounded-2xl border border-zinc-900 hover:border-zinc-700 transition-colors group">
              <Avatar className="h-10 w-10 border border-zinc-800 group-hover:border-emerald-500/30 transition-colors">
                <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs font-bold">
                  {getUserInitial(user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-zinc-200 truncate group-hover:text-white">
                  {getUserName(user.email)}
                </div>
                <div className="text-[11px] text-zinc-500 font-medium truncate">
                  {user.email}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800"
                onClick={handleSignOut}
              >
                <LogOut size={14} />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start gap-2 h-11 rounded-xl border-zinc-900 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 transition-all duration-200"
              onClick={onLoginClick}
            >
              <LogIn size={16} className="text-zinc-500" />
              <span className="font-medium">登录</span>
            </Button>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-zinc-950">
        <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-8 bg-zinc-950 z-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                 <Sparkles size={16} className="text-emerald-500" />
               </div>
               <h1 className="text-sm font-bold tracking-tight text-zinc-100">Pulse AI</h1>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono border-zinc-900 text-zinc-500 px-2 py-0">
              v2.5.0
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex -space-x-1.5">
              {[1, 2].map((i) => (
                <Avatar key={i} className="h-6 w-6 border-2 border-zinc-950 ring-1 ring-zinc-800">
                  <AvatarFallback className={`text-[10px] font-bold ${i === 1 ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {i === 1 ? 'T' : 'M'}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <Separator orientation="vertical" className="h-4 bg-zinc-800" />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900">
              <Layout size={18} />
            </Button>
          </div>
        </header>

        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
            <MessageList messages={messages} isLoading={isLoading} />
          </div>
        </ScrollArea>

        <div className="px-8 pb-8 pt-4 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(e);
            }} 
            className="max-w-3xl mx-auto"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-emerald-500/5 blur-2xl rounded-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              <div className="relative flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-2 pl-4 focus-within:border-zinc-700 focus-within:bg-zinc-900 transition-all duration-200">
                <Input
                  className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-100 placeholder:text-zinc-600 h-10 py-0"
                  value={input || ''}
                  placeholder="有什么可以帮您的？"
                  onChange={handleInputChange}
                  disabled={isLoading || isLoadingMessages}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      const currentInput = (input || '').trim();
                      if (currentInput && !isLoading) {
                        const form = e.currentTarget.closest('form');
                        if (form) form.requestSubmit();
                      }
                    }
                  }}
                />
               <Button 
                  type="submit" 
                  disabled={isLoading || !(input || '').trim() || isLoadingMessages}
                  size="icon"
                  className={`h-10 w-10 rounded-xl transition-all duration-300 ${
                    (input || '').trim() 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </Button>
              </div>
            </div>
            
            <div className="mt-3 flex items-center justify-between px-2">
              <div className="flex items-center gap-4 text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[9px] border-zinc-800 text-zinc-500 px-1 py-0 h-4 min-w-[32px] justify-center">G</Badge>
                  <span>Gemini 2.0</span>
                </div>
                <Separator orientation="vertical" className="h-2 bg-zinc-800" />
                <span className="text-emerald-500/50">Tavily Search active</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-zinc-700">
                <Command size={10} />
                <span className="font-medium">Enter 发送 / Shift Enter 换行</span>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, token, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <Loader2 size={20} className="animate-spin text-emerald-500" />
          <span className="text-sm font-medium">加载中...</span>
        </div>
      </div>
    );
  }

  if (showLogin && !user) {
    return (
      <div>
        <LoginPage />
        <div className="fixed bottom-4 right-4">
          <Button
            variant="ghost"
            onClick={() => setShowLogin(false)}
            className="text-zinc-500 hover:text-zinc-300"
          >
            取消，返回聊天
          </Button>
        </div>
      </div>
    );
  }

  return <ChatApp user={user} token={token} onLoginClick={() => setShowLogin(true)} />;
}
