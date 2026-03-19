interface ChartTooltipData {
  x: number;
  y: number;
  title: string;
  lines: string[];
}

interface ChartTooltipProps {
  tooltip: ChartTooltipData | null;
}

export function ChartTooltip({ tooltip }: ChartTooltipProps) {
  if (!tooltip) return null;

  return (
    <div
      className="pointer-events-none absolute z-20 max-w-[220px] rounded-xl border border-emerald-400/20 bg-zinc-950/95 px-3 py-2 text-xs text-zinc-100 shadow-[0_16px_36px_rgba(0,0,0,0.35)]"
      style={{
        left: tooltip.x,
        top: tooltip.y,
        transform: "translate(12px, -12px)",
      }}
    >
      <div className="mb-1 font-semibold text-emerald-300">{tooltip.title}</div>
      <div className="space-y-1 text-zinc-300">
        {tooltip.lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}
