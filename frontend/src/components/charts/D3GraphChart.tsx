import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { ChartModel } from "@/types/chart";
import { ChartTooltip } from "./ChartTooltip";

interface D3GraphChartProps {
  model: ChartModel;
}

export function D3GraphChart({ model }: D3GraphChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const svgSelectionRef =
    useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    title: string;
    lines: string[];
  } | null>(null);

  const selectedNode = useMemo(() => {
    if (model.dsl?.type !== "node-link" || !selectedNodeId) return null;
    return model.dsl.nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [model.dsl, selectedNodeId]);

  useEffect(() => {
    if (!svgRef.current || model.dsl?.type !== "node-link") return;
    const dsl = model.dsl;

    type SimNode = d3.SimulationNodeDatum & (typeof dsl.nodes)[number];

    const svg = d3.select(svgRef.current);
    svgSelectionRef.current = svg;

    const width = 760;
    const height = 340;
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const nodes = dsl.nodes.map((node) => ({ ...node })) as SimNode[];
    const links = dsl.edges.map((edge) => ({ ...edge }));

    const simulation = d3
      .forceSimulation(nodes as Array<d3.SimulationNodeDatum & (typeof nodes)[number]>)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(dsl.layout === "tree" ? 76 : 92),
      )
      .force("charge", d3.forceManyBody().strength(-340))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(28));

    for (let i = 0; i < 220; i += 1) {
      simulation.tick();
    }
    simulation.stop();

    const viewport = svg
      .selectAll<SVGGElement, null>("g.viewport")
      .data([null])
      .join("g")
      .attr("class", "viewport");

    const root = viewport
      .selectAll<SVGGElement, null>("g.graph-root")
      .data([null])
      .join("g")
      .attr("class", "graph-root");

    const updateGraph = () => {
      root
        .selectAll("line.link")
        .data(links, (d: any) => d.id)
        .join("line")
        .attr("class", "link")
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)
        .attr("stroke", (d: any) => {
          const active =
            d.highlighted ||
            d.source.id === selectedNodeId ||
            d.target.id === selectedNodeId ||
            d.source.id === hoveredNodeId ||
            d.target.id === hoveredNodeId;
          return active ? "#34d399" : "#52525b";
        })
        .attr("stroke-width", (d: any) =>
          d.source.id === selectedNodeId ||
          d.target.id === selectedNodeId ||
          d.source.id === hoveredNodeId ||
          d.target.id === hoveredNodeId
            ? 3
            : d.highlighted
              ? 2.5
              : 1.5,
        )
        .attr("stroke-linecap", "round");

      root
        .selectAll("text.edge-label")
        .data(links.filter((edge) => edge.label), (d: any) => d.id)
        .join("text")
        .attr("class", "edge-label")
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2 - 6)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .attr("fill", "#a7f3d0")
        .text((d: any) => d.label);

      const node = root
        .selectAll<SVGGElement, (typeof nodes)[number]>("g.node")
        .data(nodes, (d: any) => d.id)
        .join("g")
        .attr("class", "node")
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`)
        .style("cursor", "grab");

      node
        .selectAll("circle")
        .data((d) => [d])
        .join("circle")
        .attr("r", (d) =>
          d.id === selectedNodeId || d.id === hoveredNodeId ? 21 : 18,
        )
        .attr("fill", (d) =>
          d.id === selectedNodeId
            ? "#facc15"
            : d.highlighted || d.id === hoveredNodeId
              ? "#065f46"
              : "#18181b",
        )
        .attr("stroke", (d) =>
          d.id === selectedNodeId
            ? "#713f12"
            : d.highlighted || d.id === hoveredNodeId
              ? "#34d399"
              : "#52525b",
        )
        .attr("stroke-width", (d) =>
          d.id === selectedNodeId || d.id === hoveredNodeId ? 2.5 : 1.5,
        );

      node
        .selectAll("text")
        .data((d) => [d])
        .join("text")
        .attr("text-anchor", "middle")
        .attr("dy", 4)
        .attr("font-size", 12)
        .attr("font-weight", 700)
        .attr("fill", "#fafafa")
        .text((d) => d.label);

      const dragBehavior = d3
        .drag<SVGGElement, SimNode>()
        .on("start", function () {
          d3.select(this).style("cursor", "grabbing");
        })
        .on("drag", function (event, datum) {
          datum.x = event.x;
          datum.y = event.y;
          updateGraph();
        })
        .on("end", function () {
          d3.select(this).style("cursor", "grab");
        });

      node
        .call(dragBehavior)
        .on("mouseenter mousemove", function (event, datum) {
          const [pointerX, pointerY] = d3.pointer(event, svgRef.current);
          setHoveredNodeId(datum.id);
          setTooltip({
            x: pointerX,
            y: pointerY,
            title: datum.label,
            lines: [
              `id: ${datum.id}`,
              datum.group ? `group: ${datum.group}` : "group: default",
            ],
          });
        })
        .on("mouseleave", () => {
          setHoveredNodeId(null);
          setTooltip(null);
        })
        .on("click", (_, datum) => {
          setSelectedNodeId((current) => (current === datum.id ? null : datum.id));
        });
    };

    if (!zoomRef.current) {
      zoomRef.current = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.6, 3])
        .on("zoom", (event) => {
          viewport.attr("transform", event.transform.toString());
        });
    }

    svg.call(zoomRef.current as any);
    updateGraph();
  }, [hoveredNodeId, model, selectedNodeId]);

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
      {selectedNode ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
          <span className="font-semibold text-emerald-300">
            Selected Node:
          </span>{" "}
          {selectedNode.label} ({selectedNode.id})
        </div>
      ) : null}
    </div>
  );
}
