import { Activity, GitBranchPlus, PlayCircle } from "lucide-react";
import type { AlgorithmSceneModel } from "@/types/scene";
import { AlgorithmScenePlayer } from "./AlgorithmScenePlayer";

interface StreamAlgorithmSceneCardProps {
  model: AlgorithmSceneModel;
}

const STATUS_LABELS = {
  planning: "Planning",
  building: "Building",
  ready: "Ready",
} as const;

export function StreamAlgorithmSceneCard({
  model,
}: StreamAlgorithmSceneCardProps) {
  return (
    <section className="rounded-[28px] border border-cyan-500/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(9,9,11,0.08))] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-cyan-200">
            <PlayCircle size={15} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">
              Interactive Algorithm Scene
            </span>
          </div>
          <h3 className="text-lg font-semibold text-foreground">{model.title}</h3>
          {model.description ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {model.description}
            </p>
          ) : null}
        </div>

        <div className="rounded-full border border-cyan-500/20 bg-black/20 px-3 py-1.5 text-[11px] font-medium text-cyan-100">
          {STATUS_LABELS[model.status]}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="rounded-full border border-border bg-background/50 px-2.5 py-1">
          Kind: {model.sceneKind.toUpperCase()}
        </span>
        <span className="rounded-full border border-border bg-background/50 px-2.5 py-1">
          Steps: {model.steps.length}
        </span>
        <span className="rounded-full border border-border bg-background/50 px-2.5 py-1">
          Nodes: {model.graph?.nodes.length ?? 0}
        </span>
      </div>

      <AlgorithmScenePlayer model={model} compact />

      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Activity size={13} className="text-cyan-400" />
        <span>流式结构 + 步骤增量更新</span>
        <GitBranchPlus size={12} className="ml-2 text-cyan-400/80" />
        <span>前端本地播放控制，不依赖固定图表类型</span>
      </div>
    </section>
  );
}
