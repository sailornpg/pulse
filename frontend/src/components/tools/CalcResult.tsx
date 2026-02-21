import { Calculator, Equal } from 'lucide-react';

export function CalcResult({ result }: { result: any }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-emerald-400 font-bold">
        <Calculator size={18} />
        <span>精准计算器</span>
      </div>
      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-2 opacity-5">
            <Calculator size={80} />
        </div>
        <div className="text-zinc-500 text-xs mb-2">计算结果</div>
        <div className="flex items-center gap-4">
            <div className="text-4xl font-mono font-black text-emerald-400 tracking-tight">
                {result.result ?? result.error}
            </div>
            <div className="bg-emerald-500/20 p-1.5 rounded-lg">
                <Equal size={20} className="text-emerald-400" />
            </div>
        </div>
      </div>
    </div>
  );
}
