import { Clock, Globe } from 'lucide-react';

export function TimeResult({ result }: { result: any }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-purple-400 font-bold">
        <Clock size={18} />
        <span>系统时间查询</span>
      </div>
      <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
        <div>
          <div className="text-4xl font-mono font-bold text-zinc-100 tracking-tighter">
            {new Date(result.iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-zinc-500 text-xs mt-1 flex items-center gap-1">
            <Globe size={12} />
            {result.timezone} · {result.local.split(' ')[0]}
          </div>
        </div>
        <div className="bg-purple-500/10 p-3 rounded-full">
            <Clock size={24} className="text-purple-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
