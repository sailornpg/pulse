import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { ChartModel } from "@/types/chart";
import { ChartTooltip } from "./ChartTooltip";

interface D3BarChartProps {
  model: ChartModel;
}

export function D3BarChart({ model }: D3BarChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
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
    const width = 760;
    const height = 320;
    const margin = { top: 20, right: 20, bottom: 34, left: 44 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const { xField, yField } = model.dsl;

    const rows = model.dsl.data.map((datum) => ({
      id: datum.id,
      label: String(datum.label ?? datum[xField]),
      value: Number(datum[yField]),
    }));

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const root = svg
      .selectAll<SVGGElement, null>("g.chart-root")
      .data([null])
      .join("g")
      .attr("class", "chart-root")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand()
      .domain(rows.map((row) => row.label))
      .range([0, innerWidth])
      .padding(0.24);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(rows, (d) => d.value) ?? 10])
      .nice()
      .range([innerHeight, 0]);

    root
      .selectAll<SVGGElement, null>("g.x-axis")
      .data([null])
      .join("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .call((axis) => axis.selectAll("line,path").attr("stroke", "#3f3f46"))
      .call((axis) => axis.selectAll("text").attr("fill", "#a1a1aa"));

    root
      .selectAll<SVGGElement, null>("g.y-axis")
      .data([null])
      .join("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y).ticks(5))
      .call((axis) => axis.selectAll("line,path").attr("stroke", "#3f3f46"))
      .call((axis) => axis.selectAll("text").attr("fill", "#a1a1aa"));

    root
      .selectAll<SVGRectElement, typeof rows[number]>("rect.bar")
      .data(rows, (d) => d.id)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", "bar")
            .attr("x", (d) => x(d.label) ?? 0)
            .attr("y", innerHeight)
            .attr("width", x.bandwidth())
            .attr("height", 0)
            .attr("rx", 12)
            .call((selection) =>
              selection
                .transition()
                .duration(240)
                .attr("y", (d) => y(d.value))
                .attr("height", (d) => innerHeight - y(d.value)),
            ),
        (update) => update,
        (exit) => exit.remove(),
      )
      .attr("x", (d) => x(d.label) ?? 0)
      .attr("width", x.bandwidth())
      .attr("y", (d) => y(d.value))
      .attr("height", (d) => innerHeight - y(d.value))
      .attr("fill", (d) => (d.id === selectedId ? "#facc15" : "#0f766e"))
      .style("cursor", "pointer")
      .on("mouseenter mousemove", function (event, datum) {
        const [pointerX, pointerY] = d3.pointer(event, svgRef.current);
        setTooltip({
          x: pointerX,
          y: pointerY,
          title: datum.label,
          lines: [`${yField}: ${datum.value}`],
        });
      })
      .on("mouseleave", () => setTooltip(null))
      .on("click", (_, datum) => {
        setSelectedId((current) => (current === datum.id ? null : datum.id));
      });
  }, [model, selectedId]);

  return (
    <div className="relative">
      <ChartTooltip tooltip={tooltip} />
      <svg ref={svgRef} className="w-full overflow-visible" role="img" />
    </div>
  );
}
