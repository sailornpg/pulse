import { getChartKind, getChartSummary, type ChartDsl, type ChartModel } from "@/types/chart";
import { ChartRegistry } from "../charts/ChartRegistry";

interface ChartResultProps {
  result: {
    chartId: string;
    title: string;
    description?: string;
    dsl?: ChartDsl;
    rationale?: string;
    source?: "illustrative" | "provided";
  };
}

export function ChartResult({ result }: ChartResultProps) {
  const model: ChartModel = {
    chartId: result.chartId,
    title: result.title,
    status: "done",
    description: result.description,
    dsl: result.dsl ?? (result as any).dsl,
    createdAt: Date.now(),
  };
  const kind = getChartKind(model.dsl);
  const summary = getChartSummary(model);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="rounded-full border border-border bg-background/60 px-2.5 py-1">
          {result.source === "illustrative" ? "示意图" : "数据图"}
        </span>
        <span className="rounded-full border border-border bg-background/60 px-2.5 py-1">
          {kind}
        </span>
        {summary.map((item) => (
          <span
            key={item}
            className="rounded-full border border-border bg-background/60 px-2.5 py-1"
          >
            {item}
          </span>
        ))}
      </div>

      {result.rationale ? (
        <p className="text-sm leading-6 text-muted-foreground">
          {result.rationale}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-[18px] border border-white/10 bg-zinc-950/70 p-3">
        <ChartRegistry model={model} />
      </div>
    </div>
  );
}
