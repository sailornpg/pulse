import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { ChartModel } from "@/types/chart";
import { ChartTooltip } from "./ChartTooltip";

interface D3LineChartProps {
  model: ChartModel;
}

export function D3LineChart({ model }: D3LineChartProps) {
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
    const timeFormat = d3.timeFormat("%H:%M:%S");

    const rows = model.dsl.data
      .map((datum) => ({
        id: datum.id,
        x: Number(datum[xField]),
        y: Number(datum[yField]),
      }))
      .filter((datum) => Number.isFinite(datum.x) && Number.isFinite(datum.y))
      .toSorted((a, b) => a.x - b.x);

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

    const xExtent = d3.extent(rows, (d) => d.x) as [number, number];
    const yMax = d3.max(rows, (d) => d.y) ?? 0;
    const xBase =
      rows.length > 1
        ? d3.scaleTime().domain(xExtent).range([0, innerWidth])
        : d3
            .scaleTime()
            .domain([Date.now() - 60_000, Date.now() + 60_000])
            .range([0, innerWidth]);
    const yBase = d3
      .scaleLinear()
      .domain([0, yMax > 0 ? yMax * 1.15 : 10])
      .nice()
      .range([innerHeight, 0]);

    root
      .selectAll<SVGRectElement, null>("rect.plot-bg")
      .data([null])
      .join("rect")
      .attr("class", "plot-bg")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("rx", 18)
      .attr("fill", "rgba(255,255,255,0.02)");

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

    const gridGroup = root
      .selectAll<SVGGElement, null>("g.grid")
      .data([null])
      .join("g")
      .attr("class", "grid");

    const gradient = svg
      .selectAll<SVGDefsElement, null>("defs")
      .data([null])
      .join("defs");

    gradient
      .selectAll<SVGLinearGradientElement, null>("linearGradient#line-fill")
      .data([null])
      .join("linearGradient")
      .attr("id", "line-fill")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%")
      .call((selection) => {
        selection
          .selectAll("stop")
          .data([
            { offset: "0%", color: "rgba(16,185,129,0.28)" },
            { offset: "100%", color: "rgba(16,185,129,0.02)" },
          ])
          .join("stop")
          .attr("offset", (d) => d.offset)
          .attr("stop-color", (d) => d.color);
      });

    const render = (transform: d3.ZoomTransform = d3.zoomIdentity) => {
      const x = transform.rescaleX(xBase);
      const y = transform.rescaleY(yBase);

      xAxisGroup
        .call(
          d3
            .axisBottom(x)
            .ticks(6)
            .tickFormat((value) => timeFormat(value as Date)),
        )
        .call((axis) => axis.selectAll("line,path").attr("stroke", "#3f3f46"))
        .call((axis) => axis.selectAll("text").attr("fill", "#a1a1aa"));

      yAxisGroup
        .call(d3.axisLeft(y).ticks(5))
        .call((axis) => axis.selectAll("line,path").attr("stroke", "#3f3f46"))
        .call((axis) => axis.selectAll("text").attr("fill", "#a1a1aa"));

      gridGroup
        .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(() => ""))
        .call((grid) =>
          grid.selectAll("line").attr("stroke", "rgba(161,161,170,0.16)"),
        )
        .call((grid) => grid.select("path").remove());

      const line = d3
        .line<(typeof rows)[number]>()
        .x((d) => x(d.x))
        .y((d) => y(d.y))
        .curve(d3.curveMonotoneX);

      const area = d3
        .area<(typeof rows)[number]>()
        .x((d) => x(d.x))
        .y0(innerHeight)
        .y1((d) => y(d.y))
        .curve(d3.curveMonotoneX);

      plotLayer
        .selectAll<SVGPathElement, typeof rows>("path.area")
        .data(rows.length > 1 ? [rows] : [])
        .join("path")
        .attr("class", "area")
        .attr("fill", "url(#line-fill)")
        .attr("d", area);

      plotLayer
        .selectAll<SVGPathElement, typeof rows>("path.line")
        .data(rows.length > 1 ? [rows] : [])
        .join("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "#10b981")
        .attr("stroke-width", 2.5)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("d", line);

      plotLayer
        .selectAll<SVGCircleElement, (typeof rows)[number]>("circle.point")
        .data(rows, (d) => d.id)
        .join(
          (enter) =>
            enter
              .append("circle")
              .attr("class", "point")
              .attr("r", 0)
              .attr("fill", "#10b981")
              .attr("stroke", "#022c22")
              .attr("stroke-width", 1.5)
              .attr("cx", (d) => x(d.x))
              .attr("cy", (d) => y(d.y))
              .call((selection) =>
                selection.transition().duration(200).attr("r", 3.5),
              ),
          (update) => update,
          (exit) => exit.remove(),
        )
        .attr("cx", (d) => x(d.x))
        .attr("cy", (d) => y(d.y))
        .attr("r", (d) => (d.id === selectedId ? 6 : 3.5))
        .attr("fill", (d) => (d.id === selectedId ? "#facc15" : "#10b981"))
        .attr("stroke", (d) => (d.id === selectedId ? "#713f12" : "#022c22"))
        .style("cursor", "pointer")
        .on("mouseenter mousemove", function (event, datum) {
          const [pointerX, pointerY] = d3.pointer(event, svgRef.current);
          setTooltip({
            x: pointerX,
            y: pointerY,
            title: datum.id,
            lines: [
              `${xField}: ${timeFormat(new Date(datum.x))}`,
              `${yField}: ${datum.y}`,
            ],
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
