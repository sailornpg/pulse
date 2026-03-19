import { tool } from "ai";
import { z } from "zod";
import {
  buildIllustrativeChart,
  emitChartStream,
  type CartesianDatum,
  type ChartDsl,
  type ChartEventWriter,
  type NodeLinkDsl,
} from "../chat/chart-stream";

const cartesianDslSchema = z.object({
  type: z.literal("cartesian"),
  mark: z.enum(["line", "bar", "scatter"]),
  xField: z.string(),
  yField: z.string(),
  xScale: z.enum(["time", "linear", "band"]).default("linear"),
  yScale: z.literal("linear").default("linear"),
  data: z
    .array(z.record(z.union([z.string(), z.number(), z.boolean()])))
    .optional(),
});

const nodeLinkDslSchema = z.object({
  type: z.literal("node-link"),
  layout: z.enum(["force", "tree"]).default("force"),
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      group: z.string().optional(),
      highlighted: z.boolean().optional(),
    }),
  ),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      label: z.string().optional(),
      highlighted: z.boolean().optional(),
    }),
  ),
});

export function createRenderChartTool(onChartEvent?: ChartEventWriter) {
  return tool({
    description:
      "Render a visual using a generic DSL. Use cartesian for line, bar, and scatter charts. Use node-link for DFS/BFS demos, trees, state diagrams, dependency graphs, and other node-edge structures. If raw data is missing, you may generate an illustrative DSL that matches the user's request.",
    parameters: z.object({
      title: z.string().describe("A concise title for the visual."),
      description: z
        .string()
        .optional()
        .describe("Short explanation of what the visual shows."),
      chartKind: z
        .enum(["line", "bar", "scatter", "graph"])
        .describe("Fallback visual kind if you are not providing a full DSL."),
      dsl: z
        .discriminatedUnion("type", [cartesianDslSchema, nodeLinkDslSchema])
        .optional()
        .describe("Optional generic chart DSL to render directly."),
      xField: z.string().default("x").describe("Fallback x-axis field."),
      yField: z.string().default("y").describe("Fallback y-axis field."),
      pointCount: z
        .number()
        .int()
        .min(6)
        .max(24)
        .optional()
        .describe("Number of illustrative points if generating fallback data."),
      visualizationGoal: z
        .string()
        .describe("What structure, trend, or relationship this visual should explain."),
    }),
    execute: async ({
      title,
      description,
      chartKind,
      dsl,
      xField,
      yField,
      pointCount,
      visualizationGoal,
    }) => {
      const chart = buildIllustrativeChart(
        chartKind,
        title,
        description ?? visualizationGoal,
        xField,
        yField,
        pointCount,
        visualizationGoal,
      );

      if (dsl?.type === "cartesian") {
        chart.dsl = {
          type: "cartesian",
          mark: dsl.mark,
          xField: dsl.xField,
          yField: dsl.yField,
          xScale: dsl.xScale,
          yScale: dsl.yScale,
          data: (dsl.data ?? []) as CartesianDatum[],
        };
      } else if (dsl?.type === "node-link") {
        chart.dsl = dsl as NodeLinkDsl;
      }

      await emitChartStream(onChartEvent, chart);

      return {
        ...chart,
        rationale: visualizationGoal,
      };
    },
  });
}
