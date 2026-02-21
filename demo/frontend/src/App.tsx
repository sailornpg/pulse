import { useChat } from 'ai/react';
import { Terminal, Loader2, Plus, MessageSquare, User, Settings, Layout, Send } from 'lucide-react';
import { ToolRenderer } from './components/ToolRenderer';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export default function App() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: 'http://localhost:3001/chat',
  });

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* 1. 左侧侧边栏 (Sidebar) */}
      <aside className="w-64 bg-sidebar border-r border-border flex flex-col hidden md:flex shrink-0">
        <div className="p-4">
          <Button variant="secondary" className="w-full justify-start gap-2 h-11 rounded-xl shadow-sm border-zinc-800/50">
            <Plus size={16} className="text-emerald-500" />
            开启新对话
          </Button>
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3 mt-4">最近对话</div>
          <div className="space-y-1">
            {[
              '北京旅游攻略调研',
              'Tavily MCP 集成测试',
              'React 性能优化实战',
              'NestJS 架构设计方案'
            ].map((chat, i) => (
              <Button key={i} variant="ghost" className="w-full justify-start gap-3 h-10 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 group font-normal">
                <MessageSquare size={14} className="group-hover:text-emerald-400" />
                <span className="truncate">{chat}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 space-y-4">
          <Separator className="bg-zinc-800/50" />
          <Button variant="ghost" className="w-full justify-start gap-3 text-zinc-400 hover:text-zinc-100 px-3">
            <Settings size={16} />
            系统设置
          </Button>
          <div className="flex items-center gap-3 p-3 bg-zinc-900/40 rounded-xl border border-border/50">
            <Avatar className="h-9 w-9 border border-emerald-500/20">
              <AvatarImage src="" />
              <AvatarFallback className="bg-emerald-500/10 text-emerald-500 text-xs">DA</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">Developer Admin</div>
              <div className="text-[10px] text-muted-foreground truncate">Free Plan</div>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. 右侧主内容区 (Main Content) */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* 顶部 Header */}
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-background/50 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <Terminal size={18} className="text-emerald-500" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-foreground tracking-tight leading-none mb-1">Pulse AI</h1>
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-zinc-800 text-zinc-500 font-mono">
                v2.5.0-PRO
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              <Avatar className="h-6 w-6 border-2 border-background">
                <AvatarFallback className="bg-blue-500/10 text-blue-500 text-[10px]">T</AvatarFallback>
              </Avatar>
              <Avatar className="h-6 w-6 border-2 border-background">
                <AvatarFallback className="bg-emerald-500/10 text-emerald-500 text-[10px]">M</AvatarFallback>
              </Avatar>
            </div>
            <Separator orientation="vertical" className="h-4 bg-zinc-800" />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
              <Layout size={18} />
            </Button>
          </div>
        </header>

        {/* 消息滚动区 */}
        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`${m.role === 'user' ? 'max-w-[80%]' : 'w-full'} flex gap-4`}>
                  {m.role !== 'user' && (
                    <Avatar className="h-8 w-8 mt-1 border border-emerald-500/20 shadow-sm shrink-0">
                      <AvatarFallback className="bg-emerald-500/10 text-emerald-500 text-[10px]">AI</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 space-y-4">
                    <Card className={`p-5 shadow-sm border-zinc-800/50 ${
                      m.role === 'user' 
                        ? 'bg-emerald-600 border-none text-white rounded-tr-none shadow-emerald-900/20' 
                        : 'bg-zinc-900/40 text-zinc-100 rounded-tl-none backdrop-blur-sm'
                    }`}>
                      <div className="text-[14px] leading-relaxed prose prose-invert max-w-none prose-p:my-3 prose-li:my-1">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    </Card>

                    {/* 工具渲染器 */}
                    {m.toolInvocations && (
                      <div className="grid grid-cols-1 gap-4">
                        {m.toolInvocations.map((toolInvocation) => (
                          <ToolRenderer 
                              key={toolInvocation.toolCallId} 
                              {...toolInvocation} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <Avatar className="h-8 w-8 mt-1 border border-emerald-500/40 shadow-sm shrink-0">
                      <AvatarFallback className="bg-emerald-600 text-white text-[10px]">ME</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length -1]?.role !== 'assistant' && (
              <div className="flex justify-start gap-4">
                 <Avatar className="h-8 w-8 mt-1 border border-zinc-800 shrink-0">
                    <AvatarFallback className="bg-zinc-900 text-zinc-500 text-[10px]">AI</AvatarFallback>
                 </Avatar>
                 <Card className="bg-zinc-900/40 p-5 rounded-2xl rounded-tl-none border border-zinc-800/50 flex items-center gap-3">
                    <Loader2 className="animate-spin text-emerald-500" size={18} />
                    <span className="text-xs text-muted-foreground font-medium">AI 正在思考并准备回复...</span>
                 </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 输入区 (固定底部) */}
        <div className="p-6 bg-gradient-to-t from-background via-background/80 to-transparent">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
            <div className="absolute inset-0 bg-emerald-500/5 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000"></div>
            <Input
              className="relative w-full h-14 bg-zinc-900/50 backdrop-blur-xl border-zinc-800 focus-visible:ring-1 focus-visible:ring-emerald-500/50 rounded-2xl px-6 py-4 text-sm shadow-2xl placeholder:text-zinc-600"
              value={input}
              placeholder="发送指令以解析、搜素或生成..."
              onChange={handleInputChange}
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              size="sm"
              className="absolute right-2 top-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg transition-all active:scale-95"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="mr-2" />}
              {isLoading ? "" : "发送"}
            </Button>
          </form>
          <div className="max-w-4xl mx-auto mt-4 px-2 flex items-center gap-4 text-[10px] text-muted-foreground font-medium">
            <Badge variant="outline" className="text-[9px] border-zinc-800 font-normal">Gemini 2.0</Badge>
            <Separator orientation="vertical" className="h-2 bg-zinc-800" />
            <span>Tavily Search Enabled</span>
            <Separator orientation="vertical" className="h-2 bg-zinc-800" />
            <span className="text-emerald-500/80 uppercase tracking-tighter">Ultra Low Latency</span>
          </div>
        </div>
      </main>
    </div>
  );
}
