import { CloudSun, Wind } from 'lucide-react';

export function WeatherResult({ result }: { result: any }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-blue-400 font-bold">
        <CloudSun size={18} />
        <span>天气实况</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
          <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1">城市</div>
          <div className="text-zinc-100 text-sm font-mono">{result.location}</div>
        </div>
        <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
          <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1">温度</div>
          <div className="text-zinc-100 text-sm font-mono text-orange-400">{result.temperature}°C</div>
        </div>
        <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 col-span-2 flex items-center justify-between">
          <div>
            <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1">条件 & 预报</div>
            <div className="text-zinc-100 text-sm">{result.condition}</div>
            <div className="text-zinc-400 text-xs mt-1">{result.forecast}</div>
          </div>
          <Wind className="text-zinc-700" size={32} />
        </div>
      </div>
    </div>
  );
}
