export type ChartKind = "line" | "bar" | "scatter" | "graph";
export type ChartStatus = "planning" | "fetching" | "rendering" | "done";

export type DslScalar = string | number | boolean;

export interface CartesianDatum {
  [key: string]: DslScalar | undefined;
  id: string;
}

export interface GraphNode {
  [key: string]: string | boolean | undefined;
  id: string;
  label: string;
  group?: string;
  highlighted?: boolean;
}

export interface GraphEdge {
  [key: string]: string | boolean | undefined;
  id: string;
  source: string;
  target: string;
  label?: string;
  highlighted?: boolean;
}

export interface CartesianDsl {
  [key: string]:
    | string
    | CartesianDatum[]
    | undefined;
  type: "cartesian";
  mark: "line" | "bar" | "scatter";
  xField: string;
  yField: string;
  xScale: "time" | "linear" | "band";
  yScale: "linear";
  data: CartesianDatum[];
}

export interface NodeLinkDsl {
  [key: string]:
    | string
    | GraphNode[]
    | GraphEdge[]
    | undefined;
  type: "node-link";
  layout: "force" | "tree";
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type ChartDsl = CartesianDsl | NodeLinkDsl;

export type ChartDslPatch =
  | {
      op: "append-cartesian-data";
      data: CartesianDatum[];
    }
  | {
      op: "replace-node-link";
      dsl: NodeLinkDsl;
    };

export interface ChartToolResult {
  chartId: string;
  title: string;
  description?: string;
  dsl: ChartDsl;
  source: "illustrative" | "provided";
}

export type ChartStreamEvent =
  | {
      type: "chart-start";
      chartId: string;
      chartKind: ChartKind;
      title: string;
      description?: string;
    }
  | {
      type: "chart-dsl-replace";
      chartId: string;
      dsl: ChartDsl;
    }
  | {
      type: "chart-dsl-patch";
      chartId: string;
      patch: ChartDslPatch;
    }
  | {
      type: "chart-status";
      chartId: string;
      status: ChartStatus;
    }
  | {
      type: "chart-done";
      chartId: string;
    };

export type ChartEventWriter = (
  event: ChartStreamEvent,
) => void | Promise<void>;

export async function emitChartStream(
  writeEvent: ChartEventWriter | undefined,
  chart: ChartToolResult,
  options?: {
    batchSize?: number;
    delayMs?: number;
  },
) {
  if (!writeEvent) return;

  const batchSize = options?.batchSize ?? 3;
  const delayMs = options?.delayMs ?? 140;

  await writeEvent({
    type: "chart-start",
    chartId: chart.chartId,
    chartKind: getChartKind(chart.dsl),
    title: chart.title,
    description: chart.description,
  });

  await sleep(80);
  await writeEvent({
    type: "chart-status",
    chartId: chart.chartId,
    status: "fetching",
  });

  if (chart.dsl.type === "node-link") {
    await sleep(80);
    await writeEvent({
      type: "chart-status",
      chartId: chart.chartId,
      status: "rendering",
    });
    await writeEvent({
      type: "chart-dsl-replace",
      chartId: chart.chartId,
      dsl: chart.dsl,
    });
    await sleep(delayMs);
  } else {
    await writeEvent({
      type: "chart-dsl-replace",
      chartId: chart.chartId,
      dsl: {
        ...chart.dsl,
        data: [],
      },
    });

    for (let index = 0; index < chart.dsl.data.length; index += batchSize) {
      if (index === 0) {
        await writeEvent({
          type: "chart-status",
          chartId: chart.chartId,
          status: "rendering",
        });
      }

      await writeEvent({
        type: "chart-dsl-patch",
        chartId: chart.chartId,
        patch: {
          op: "append-cartesian-data",
          data: chart.dsl.data.slice(index, index + batchSize),
        },
      });

      await sleep(delayMs);
    }
  }

  await writeEvent({
    type: "chart-done",
    chartId: chart.chartId,
  });
}

export function buildIllustrativeChart(
  chartKind: ChartKind,
  title: string,
  description?: string,
  xField = chartKind === "scatter" ? "index" : "time",
  yField = "value",
  pointCount = chartKind === "bar" ? 8 : 12,
  seedText = title,
): ChartToolResult {
  return {
    chartId: `chart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    description,
    dsl:
      chartKind === "graph"
        ? buildIllustrativeGraphDsl(seedText)
        : buildIllustrativeCartesianDsl(
            chartKind,
            xField,
            yField,
            pointCount,
            seedText,
          ),
    source: "illustrative",
  };
}

function buildIllustrativeCartesianDsl(
  chartKind: Exclude<ChartKind, "graph">,
  xField: string,
  yField: string,
  pointCount: number,
  seedText: string,
): CartesianDsl {
  const seed = Array.from(seedText).reduce((sum, char, index) => {
    return sum + char.charCodeAt(0) * (index + 1);
  }, 0);

  if (chartKind === "scatter") {
    return {
      type: "cartesian",
      mark: "scatter",
      xField,
      yField,
      xScale: "linear",
      yScale: "linear",
      data: Array.from({ length: pointCount }, (_, index) => ({
        id: `scatter-${index}`,
        [xField]: index + 1,
        [yField]: 28 + ((seed + index * 11) % 42),
        label: `${index + 1}`,
      })),
    };
  }

  const now = Date.now() - pointCount * 60_000;
  return {
    type: "cartesian",
    mark: chartKind,
    xField,
    yField,
    xScale: chartKind === "bar" ? "band" : "time",
    yScale: "linear",
    data: Array.from({ length: pointCount }, (_, index) => {
      const baseline = chartKind === "bar" ? 18 : 10;
      const swing = chartKind === "bar" ? 14 : 9;
      const wave = Math.sin((index + (seed % 5)) / 1.8) * swing;
      const trend = index * (chartKind === "bar" ? 0.8 : 1.6);
      const value = Math.max(
        4,
        Math.round(baseline + wave + trend + (seed % 7)),
      );

      return {
        id: `${chartKind}-${index}`,
        [xField]: now + index * 60_000,
        [yField]: value,
        label: chartKind === "bar" ? `${index + 1}` : undefined,
      };
    }),
  };
}

function buildIllustrativeGraphDsl(seedText: string): NodeLinkDsl {
  const isDfsDemo = /\bdfs\b|深度优先|depth first/i.test(seedText);

  if (isDfsDemo) {
    return {
      type: "node-link",
      layout: "tree",
      nodes: [
        { id: "A", label: "A", highlighted: true },
        { id: "B", label: "B", highlighted: true },
        { id: "C", label: "C" },
        { id: "D", label: "D", highlighted: true },
        { id: "E", label: "E", highlighted: true },
        { id: "F", label: "F" },
      ],
      edges: [
        { id: "A-B", source: "A", target: "B", highlighted: true, label: "1" },
        { id: "A-C", source: "A", target: "C" },
        { id: "B-D", source: "B", target: "D", highlighted: true, label: "2" },
        { id: "B-E", source: "B", target: "E", highlighted: true, label: "3" },
        { id: "C-F", source: "C", target: "F" },
      ],
    };
  }

  return {
    type: "node-link",
    layout: "force",
    nodes: [
      { id: "N1", label: "Node 1", highlighted: true },
      { id: "N2", label: "Node 2" },
      { id: "N3", label: "Node 3" },
      { id: "N4", label: "Node 4" },
      { id: "N5", label: "Node 5" },
    ],
    edges: [
      { id: "N1-N2", source: "N1", target: "N2", highlighted: true },
      { id: "N1-N3", source: "N1", target: "N3" },
      { id: "N2-N4", source: "N2", target: "N4" },
      { id: "N3-N5", source: "N3", target: "N5" },
    ],
  };
}

function getChartKind(dsl: ChartDsl): ChartKind {
  if (dsl.type === "node-link") return "graph";
  return dsl.mark;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
