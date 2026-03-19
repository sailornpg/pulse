import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { ChartModel } from "@/types/chart";
import { ChartTooltip } from "./ChartTooltip";

interface D3ScatterChartProps {
  model: ChartModel;
}

export function D3ScatterChart({ model }: D3ScatterChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const svgSelectionRef =
    useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    title: string;
    lines: string[];
  } | null>(null);

  useEffect(() => {
    if (!svgRef.current || model.dsl?.type !== "cartesian") return;

    const svg = d3.select(svgRef.current);
    svgSelectionRef.current = svg;

    const width = 760;
    const height = 320;
    const margin = { top: 20, right: 20, bottom: 34, left: 44 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const { xField, yField } = model.dsl;

    const rows = model.dsl.data
      .map((datum) => ({
        id: datum.id,
        x: Number(datum[xField]),
        y: Number(datum[yField]),
      }))
      .filter((datum) => Number.isFinite(datum.x) && Number.isFinite(datum.y));

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const root = svg
      .selectAll<SVGGElement, null>("g.chart-root")
      .data([null])
      .join("g")
      .attr("class", "chart-root")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const plotLayer = root
      .selectAll<SVGGElement, null>("g.plot-layer")
      .data([null])
      .join("g")
      .attr("class", "plot-layer");

    const xBase = d3
      .scaleLinear()
      .domain(d3.extent(rows, (d) => d.x) as [number, number])
      .nice()
      .range([0, innerWidth]);
    const yBase = d3
      .scaleLinear()
      .domain(d3.extent(rows, (d) => d.y) as [number, number])
      .nice()
      .range([innerHeight, 0]);

    const xAxisGroup = root
      .selectAll<SVGGElement, null>("g.x-axis")
      .data([null])
      .join("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`);

    const yAxisGroup = root
      .selectAll<SVGGElement, null>("g.y-axis")
      .data([null])
      .join("g")
      .attr("class", "y-axis");

    const render = (transform: d3.ZoomTransform = d3.zoomIdentity) => {
      const x = transform.rescaleX(xBase);
      const y = transform.rescaleY(yBase);

      xAxisGroup
        .call(d3.axisBottom(x).ticks(6))
        .call((axis) => axis.selectAll("line,path").attr("stroke", "#3f3f46"))
        .call((axis) => axis.selectAll("text").attr("fill", "#a1a1aa"));

      yAxisGroup
        .call(d3.axisLeft(y).ticks(5))
        .call((axis) => axis.selectAll("line,path").attr("stroke", "#3f3f46"))
        .call((axis) => axis.selectAll("text").attr("fill", "#a1a1aa"));

      plotLayer
        .selectAll<SVGCircleElement, typeof rows[number]>("circle.point")
        .data(rows, (d) => d.id)
        .join(
          (enter) =>
            enter
              .append("circle")
              .attr("class", "point")
              .attr("r", 0)
              .attr("fill", "#22c55e")
              .attr("fill-opacity", 0.8)
              .attr("cx", (d) => x(d.x))
              .attr("cy", (d) => y(d.y))
              .call((selection) =>
                selection.transition().duration(180).attr("r", 4.5),
              ),
          (update) => update,
          (exit) => exit.remove(),
        )
        .attr("cx", (d) => x(d.x))
        .attr("cy", (d) => y(d.y))
        .attr("r", (d) => (d.id === selectedId ? 7 : 4.5))
        .attr("fill", (d) => (d.id === selectedId ? "#facc15" : "#22c55e"))
        .attr("stroke", (d) => (d.id === selectedId ? "#713f12" : "#052e16"))
        .attr("stroke-width", 1.5)
        .style("cursor", "pointer")
        .on("mouseenter mousemove", function (event, datum) {
          const [pointerX, pointerY] = d3.pointer(event, svgRef.current);
          setTooltip({
            x: pointerX,
            y: pointerY,
            title: datum.id,
            lines: [`${xField}: ${datum.x}`, `${yField}: ${datum.y}`],
          });
        })
        .on("mouseleave", () => setTooltip(null))
        .on("click", (_, datum) => {
          setSelectedId((current) => (current === datum.id ? null : datum.id));
        });
    };

    if (!zoomRef.current) {
      zoomRef.current = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, 8])
        .translateExtent([
          [0, 0],
          [width, height],
        ])
        .extent([
          [0, 0],
          [width, height],
        ]);
    }

    zoomRef.current.on("zoom", (event) => render(event.transform));
    svg.call(zoomRef.current as any);
    render();
  }, [model, selectedId]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (svgSelectionRef.current && zoomRef.current) {
            svgSelectionRef.current
              .transition()
              .duration(180)
              .call((zoomRef.current.transform as any), d3.zoomIdentity);
          }
        }}
        className="absolute right-2 top-2 z-10 rounded-full border border-white/10 bg-zinc-950/80 px-3 py-1 text-[11px] text-zinc-300 transition hover:border-emerald-400/30 hover:text-zinc-100"
      >
        Reset View
      </button>
      <ChartTooltip tooltip={tooltip} />
      <svg ref={svgRef} className="w-full overflow-visible" role="img" />
    </div>
  );
}
