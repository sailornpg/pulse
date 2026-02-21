import { useChat } from 'ai/react';
import type { Message } from 'ai';

import { Terminal, Loader2, Plus, MessageSquare, User, Settings, Layout, Send, Sparkles, Command } from 'lucide-react';
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
import { useEffect, useRef, memo } from 'react';

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
                {/* 顺序部件渲染 (Sequential Rendering) */}
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
                      return (
                        <div 
                          key={part.toolCallId}
                          className="animate-in fade-in duration-300"
                        >
                          {/* @ts-ignore */}
                          <ToolRenderer {...part.toolInvocation} />
                        </div>
                      );
                    }
                    return null;
                  })
                ) : (
                  /* 回退渲染 (用户消息 & 兼容旧模式) */
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
                        {m.toolInvocations.map((toolInvocation) => (
                          <div key={toolInvocation.toolCallId} className="animate-in fade-in duration-300">
                            {/* @ts-ignore */}
                            <ToolRenderer {...toolInvocation} />
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

export default function App() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: 'http://localhost:3001/chat',
    initialInput: '',
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

  return (
    <div className="flex h-screen bg-zinc-950 text-foreground overflow-hidden font-sans selection:bg-emerald-500/10 selection:text-emerald-400">
      {/* 1. 左侧侧边栏 (Sidebar) - 重构为极简风格 */}
      <aside className="w-72 bg-zinc-950 border-r border-zinc-900 flex flex-col hidden md:flex shrink-0">
        <div className="p-6">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 h-11 rounded-xl border-zinc-900 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 transition-all duration-200 group"
          >
            <Plus size={16} className="text-zinc-500 group-hover:text-emerald-500 transition-colors" />
            <span className="font-medium">新对话</span>
            <Badge variant="outline" className="ml-auto text-[10px] border-zinc-800 text-zinc-600 bg-zinc-950">Ctrl K</Badge>
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3">
          <div className="px-3 text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-4 mt-2">
            我的会话
          </div>
          <div className="space-y-1">
            {[
              { title: '北京旅游攻略调研', active: true },
              { title: 'Tavily MCP 集成测试', active: false },
              { title: 'React 性能优化实战', active: false },
              { title: 'NestJS 架构设计方案', active: false }
            ].map((chat, i) => (
              <Button 
                key={i} 
                variant="ghost" 
                className={`w-full justify-start gap-3 h-11 px-3 rounded-lg font-normal transition-all duration-200 group ${
                  chat.active ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
              >
                <MessageSquare size={14} className={chat.active ? 'text-emerald-500' : 'text-zinc-600 group-hover:text-emerald-500/70'} />
                <span className="truncate">{chat.title}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 mt-auto">
          <div className="flex items-center gap-3 p-3 bg-zinc-900/30 rounded-2xl border border-zinc-900 hover:border-zinc-700 transition-colors cursor-pointer group">
            <Avatar className="h-10 w-10 border border-zinc-800 group-hover:border-emerald-500/30 transition-colors">
              <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs font-bold">DA</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-zinc-200 truncate group-hover:text-white">Developer Admin</div>
              <div className="text-[11px] text-zinc-500 font-medium">Free Plan</div>
            </div>
            <Settings size={14} className="text-zinc-600 group-hover:text-zinc-400" />
          </div>
        </div>
      </aside>

      {/* 2. 右侧主内容区 (Main Content) */}
      <main className="flex-1 flex flex-col relative bg-zinc-950">
        {/* 精致 Header */}
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

        {/* 消息滚动区 */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
            <MessageList messages={messages} isLoading={isLoading} />
          </div>
        </ScrollArea>

        {/* 极简底部输入区 */}
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
                  disabled={isLoading}
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
                  disabled={isLoading || !(input || '').trim()}
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
