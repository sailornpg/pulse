import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Clock, Zap, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WeatherResult } from './tools/WeatherResult';
import { TimeResult } from './tools/TimeResult';
import { CalcResult } from './tools/CalcResult';
import { SearchResult } from './tools/SearchResult';

// 工具名称到组件的映射表 (Registry)
const TOOL_COMPONENTS: Record<string, React.ComponentType<{ result: any; args?: any }>> = {
  getWeather: WeatherResult,
  getCurrentTime: TimeResult,
  calculate: CalcResult,
  tavily_search: SearchResult,
  tavily_research: SearchResult,
};

// 工具调用的"思考中"话术阶段
const THINKING_PHASES = [
  "正在初始化网络检索进程...",
  "正在访问多个全球数据来源...",
  "正在对检索到的信息进行语义分析...",
  "正在提取核心事实与关键数据...",
  "正在合成最准确的信息回复...",
];

interface ToolRendererProps {
  toolName: string;
  toolCallId: string;
  state: 'call' | 'result';
  args: any;
  result?: any;
}

// 模块级缓存，确保组件卸载重装时耗时数据不丢失
const durationCache: Record<string, { start: number; duration?: number }> = {};
// 记录已自动收起的卡片 ID，防止重挂载时重复触发动画
const autoCollapsedIds = new Set<string>();
// 最大缓存条数，超出时淘汰最旧的记录
const MAX_CACHE = 200;
function trimCache() {
  const keys = Object.keys(durationCache);
  if (keys.length > MAX_CACHE) keys.slice(0, keys.length - MAX_CACHE).forEach(k => delete durationCache[k]);
  if (autoCollapsedIds.size > MAX_CACHE) {
    const it = autoCollapsedIds.values();
    for (let i = 0; i < autoCollapsedIds.size - MAX_CACHE; i++) {
      const next = it.next();
      if (next.value) autoCollapsedIds.delete(next.value);
    }
  }
}

export function ToolRenderer({ toolName, toolCallId, state, args, result }: ToolRendererProps) {
  const [elapsed, setElapsed] = useState<number>(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [isExpanded, setIsExpanded] = useState(() => !autoCollapsedIds.has(toolCallId));

  // 检查缓存
  if (state === 'call' && !durationCache[toolCallId]) {
    trimCache();
    durationCache[toolCallId] = { start: Date.now() };
  }
  const cached = durationCache[toolCallId];

  // 工具执行完毕后延迟 50ms 自动收起（仅首次）
  useEffect(() => {
    if (state === 'result' && !autoCollapsedIds.has(toolCallId)) {
      const t = setTimeout(() => {
        trimCache();
        autoCollapsedIds.add(toolCallId);
        setIsExpanded(false);
      }, 50);
      return () => clearTimeout(t);
    }
  }, [state, toolCallId]);

  // 1. 计时器与阶段切换
  useEffect(() => {
    if (state !== 'call' || !cached) return;

    const timer = setInterval(() => {
      const currentElapsed = (Date.now() - cached.start) / 1000;
      setElapsed(currentElapsed);
      
      // 每隔 2 秒自动切换话术阶段，增加"过程感"
      setPhaseIdx(prev => {
        const next = Math.floor(currentElapsed / 2);
        return next < THINKING_PHASES.length ? next : THINKING_PHASES.length - 1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [state, cached]);

  // 2. 当进入 result 状态时，锁定最终耗时
  if (state === 'result' && cached && cached.duration === undefined) {
    cached.duration = (Date.now() - cached.start) / 1000;
  }

  const displayDuration = state === 'call' ? elapsed : (cached?.duration || 0);

  // 1. 加载状态展示
  if (state === 'call') {
    return (
      <div className="mt-4 p-5 bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-emerald-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)] flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Loader2 className="animate-spin text-emerald-500" size={20} />
                    <Zap size={10} className="absolute inset-0 m-auto text-emerald-400 animate-pulse" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-zinc-200">
                         PULSE 正在操作: <span className="text-emerald-400">{toolName}</span>
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono animate-pulse">
                        {THINKING_PHASES[phaseIdx]}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-[10px] text-emerald-400/80 font-mono">
                <Clock size={10} className="animate-spin" style={{ animationDuration: '3s' }} />
                <span>实时计时: {displayDuration.toFixed(1)}s</span>
            </div>
        </div>
        
        {/* 模拟进度条 */}
        <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
            <div 
                className="h-full bg-emerald-500/50 transition-all duration-500 ease-out"
                style={{ width: `${Math.min((phaseIdx + 1) * 20 + (elapsed % 2) * 5, 98)}%` }}
            ></div>
        </div>
      </div>
    );
  }
  <div>{JSON.stringify(state)}12312</div>
  // 2. 结果状态展示（带展开/收起）
  if (state === 'result') {
    const Component = TOOL_COMPONENTS[toolName];
    
    return (
      <div className="mt-4 bg-zinc-950 rounded-2xl border border-zinc-800/80 hover:border-zinc-700/80 transition-colors duration-300 shadow-xl overflow-hidden">
        {/* 卡片头部（点击可展开/收起） */}
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className="w-full flex items-center justify-between p-5 text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shrink-0">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-bold text-zinc-100">执行成功</h3>
                <h3 className='text-[10px] text-zinc-500 font-mono uppercase tracking-tighter'>({toolName})</h3>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-tighter">Tool ID: {toolCallId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 rounded-lg border border-zinc-800 text-[10px] text-zinc-400 font-mono shadow-inner">
              <Clock size={10} className="text-zinc-600" />
              <span>处理耗时: <span className="text-zinc-200">{displayDuration.toFixed(1)}s</span></span>
            </div>
            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-zinc-500 group-hover:text-zinc-300 transition-all duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown size={14} />
            </div>
          </div>
        </button>

        {/* 可折叠内容区 */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-5 pb-5">
                <div className="relative overflow-hidden rounded-xl bg-zinc-900/20 p-3 border border-zinc-800/30">
                  {Component ? (
                    <Component result={result} args={args} />
                  ) : (
                    <div className="p-3">
                      <pre className="text-[10px] bg-black/40 p-3 rounded-lg overflow-x-auto text-zinc-400 font-mono border border-zinc-900/50">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return null;
}
