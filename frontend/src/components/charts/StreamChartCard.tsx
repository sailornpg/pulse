import { Activity, BarChart3, CircleDotDashed } from "lucide-react";
import { getChartSummary, type ChartModel } from "@/types/chart";
import { ChartRegistry } from "./ChartRegistry";

interface StreamChartCardProps {
  model: ChartModel;
}

const STATUS_LABELS = {
  planning: "规划中",
  fetching: "取数中",
  rendering: "绘制中",
  done: "已完成",
} as const;

export function StreamChartCard({ model }: StreamChartCardProps) {
  const summary = getChartSummary(model);

  return (
    <section className="rounded-[28px] border border-emerald-500/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(9,9,11,0.08))] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-emerald-300">
            <BarChart3 size={15} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">
              Generative Chart DSL
            </span>
          </div>
          <h3 className="text-lg font-semibold text-foreground">{model.title}</h3>
          {model.description ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {model.description}
            </p>
          ) : null}
        </div>

        <div className="rounded-full border border-emerald-500/20 bg-black/20 px-3 py-1.5 text-[11px] font-medium text-emerald-200">
          {STATUS_LABELS[model.status]}
        </div>
      </div>

      {summary.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {summary.map((item) => (
            <span
              key={item}
              className="rounded-full border border-border bg-background/50 px-2.5 py-1"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-zinc-950/60 p-3">
        <ChartRegistry model={model} />
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Activity size={13} className="text-emerald-400" />
        <span>统一 DSL 驱动 D3 渲染</span>
        <CircleDotDashed size={12} className="ml-2 text-emerald-400/80" />
        <span>前端根据 DSL 选择 renderer，而不是依赖硬编码结果结构</span>
      </div>
    </section>
  );
}
