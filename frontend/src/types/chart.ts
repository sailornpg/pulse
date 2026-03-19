export type ChartStatus = "planning" | "fetching" | "rendering" | "done";
export type ChartKind = "line" | "bar" | "scatter" | "graph";
export type DslScalar = string | number | boolean;

export interface CartesianDatum {
  [key: string]: DslScalar | undefined;
  id: string;
}

export interface GraphNode {
  id: string;
  label: string;
  group?: string;
  highlighted?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  highlighted?: boolean;
}

export interface CartesianDsl {
  type: "cartesian";
  mark: "line" | "bar" | "scatter";
  xField: string;
  yField: string;
  xScale: "time" | "linear" | "band";
  yScale: "linear";
  data: CartesianDatum[];
}

export interface NodeLinkDsl {
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

export interface ChartModel {
  chartId: string;
  title: string;
  status: ChartStatus;
  description?: string;
  dsl?: ChartDsl;
  createdAt: number;
}

export type ChartEvent =
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

export function isChartEvent(value: unknown): value is ChartEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as { type?: unknown }).type === "string" &&
    (value as { type: string }).type.startsWith("chart-")
  );
}

export function applyChartEvent(
  charts: Record<string, ChartModel>,
  event: ChartEvent,
): Record<string, ChartModel> {
  const current = charts[event.chartId];

  switch (event.type) {
    case "chart-start":
      return {
        ...charts,
        [event.chartId]: {
          chartId: event.chartId,
          title: event.title,
          status: "planning",
          description: event.description,
          createdAt: Date.now(),
        },
      };

    case "chart-dsl-replace":
      if (!current) return charts;
      return {
        ...charts,
        [event.chartId]: {
          ...current,
          dsl: event.dsl,
        },
      };

    case "chart-dsl-patch":
      if (!current?.dsl) return charts;
      return {
        ...charts,
        [event.chartId]: {
          ...current,
          dsl: applyDslPatch(current.dsl, event.patch),
        },
      };

    case "chart-status":
      if (!current) return charts;
      return {
        ...charts,
        [event.chartId]: {
          ...current,
          status: event.status,
        },
      };

    case "chart-done":
      if (!current) return charts;
      return {
        ...charts,
        [event.chartId]: {
          ...current,
          status: "done",
        },
      };

    default:
      return charts;
  }
}

export function getChartKind(dsl?: ChartDsl): ChartKind | "unknown" {
  if (!dsl) return "unknown";
  if (dsl.type === "node-link") return "graph";
  return dsl.mark;
}

export function getChartSummary(model: ChartModel) {
  if (!model.dsl) {
    return [];
  }

  if (model.dsl.type === "node-link") {
    return [
      `Nodes: ${model.dsl.nodes.length}`,
      `Edges: ${model.dsl.edges.length}`,
      `Layout: ${model.dsl.layout}`,
    ];
  }

  return [
    `X: ${model.dsl.xField}`,
    `Y: ${model.dsl.yField}`,
    `Data: ${model.dsl.data.length}`,
  ];
}

function applyDslPatch(dsl: ChartDsl, patch: ChartDslPatch): ChartDsl {
  if (patch.op === "append-cartesian-data" && dsl.type === "cartesian") {
    return {
      ...dsl,
      data: [...dsl.data, ...patch.data],
    };
  }

  if (patch.op === "replace-node-link") {
    return patch.dsl;
  }

  return dsl;
}
