import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Clock, Zap } from 'lucide-react';
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

// 工具调用的“思考中”话术阶段
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

// 模块级缓存，确保组件卸载重装（AI 持续输出导致的消息列表更新）时耗时数据不丢失
const durationCache: Record<string, { start: number; duration?: number }> = {};

export function ToolRenderer({ toolName, toolCallId, state, args, result }: ToolRendererProps) {
  const [elapsed, setElapsed] = useState<number>(0);
  const [phaseIdx, setPhaseIdx] = useState(0);

  // 检查缓存
  if (state === 'call' && !durationCache[toolCallId]) {
    durationCache[toolCallId] = { start: Date.now() };
  }
  const cached = durationCache[toolCallId];

  // 1. 计时器与阶段切换
  useEffect(() => {
    if (state !== 'call' || !cached) return;

    const timer = setInterval(() => {
      const currentElapsed = (Date.now() - cached.start) / 1000;
      setElapsed(currentElapsed);
      
      // 每隔 2 秒自动切换话术阶段，增加“过程感”
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

  // 1. 加载状态展示 (更丰富的状态)
  if (state === 'call') {
    return (
      <div className="mt-4 p-5 bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)] flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Loader2 className="animate-spin text-blue-500" size={20} />
                    <Zap size={10} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-zinc-200">
                        AI 智能体正在操作: <span className="text-blue-400">{toolName}</span>
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono animate-pulse">
                        {THINKING_PHASES[phaseIdx]}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20 text-[10px] text-blue-400/80 font-mono">
                <Clock size={10} className="animate-spin" style={{ animationDuration: '3s' }} />
                <span>实时计时: {displayDuration.toFixed(1)}s</span>
            </div>
        </div>
        
        {/* 模拟进度条 */}
        <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
            <div 
                className="h-full bg-blue-500/50 transition-all duration-500 ease-out"
                style={{ width: `${Math.min((phaseIdx + 1) * 20 + (elapsed % 2) * 5, 98)}%` }}
            ></div>
        </div>
      </div>
    );
  }

  // 2. 结果状态展示 (更专业的卡片)
  if (state === 'result') {
    const Component = TOOL_COMPONENTS[toolName];
    
    return (
      <div className="mt-4 p-5 bg-zinc-950 rounded-2xl border border-zinc-800/80 hover:border-zinc-700/80 transition-all duration-500 shadow-xl group">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 size={16} />
            </div>
            <div>
                <h3 className="text-[13px] font-bold text-zinc-100">执行成功</h3>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-tighter">Tool ID: {toolCallId}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 rounded-lg border border-zinc-800 text-[10px] text-zinc-400 font-mono shadow-inner">
            <Clock size={10} className="text-zinc-600" />
            <span>处理耗时: <span className="text-zinc-200">{displayDuration.toFixed(1)}s</span></span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-zinc-900/20 p-1 border border-zinc-800/30">
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
    );
  }

  return null;
}
