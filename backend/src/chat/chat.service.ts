import { Injectable } from "@nestjs/common";
import { streamText } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { AgentService } from "../agent/agent.service";
import { MemoryService } from "../agent/memory.service";
import { RagService } from "../rag/rag.service";
import type { AlgorithmSceneEventWriter } from "./algorithm-scene-stream";
import type { ChartEventWriter } from "./chart-stream";
import { McpClientService } from "./mcp-client.service";
import { ToolRegistryService } from "./tool-registry.service";

const CHART_REQUEST_RE =
  /\b(chart|graph|plot|visuali[sz]e|scatter|bar chart|line chart|trend|distribution)\b|图表|画图|散点图|柱状图|折线图|趋势图|可视化/iu;
const ALGORITHM_SCENE_REQUEST_RE =
  /\b(dfs|bfs|traversal|algorithm animation|step[- ]by[- ]step algorithm|playback demo)\b|dfs|bfs|算法演示|算法动画|步骤演示|深度优先|广度优先/iu;

@Injectable()
export class ChatService {
  constructor(
    private readonly toolRegistry: ToolRegistryService,
    private readonly mcpClient: McpClientService,
    private readonly agentService: AgentService,
    private readonly memoryService: MemoryService,
    private readonly ragService: RagService,
  ) {}

  async createChatStream(
    messages: any[],
    userId?: string,
    token?: string,
    onChartEvent?: ChartEventWriter,
    onSceneEvent?: AlgorithmSceneEventWriter,
  ) {
    const deepseekProvider = createDeepSeek();
    const localTools = this.toolRegistry.getAllTools(
      userId,
      token,
      onChartEvent,
      onSceneEvent,
    );
    const externalTools = this.mcpClient.getExternalTools();
    const allTools = { ...localTools, ...externalTools };

    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");
    const latestUserText =
      typeof latestUserMessage?.content === "string"
        ? latestUserMessage.content
        : "";
    const shouldForceChartTool = CHART_REQUEST_RE.test(latestUserText);
    const shouldForceSceneTool = ALGORITHM_SCENE_REQUEST_RE.test(latestUserText);
    const chartInstruction = shouldForceChartTool
      ? "The user is explicitly asking for a chart or graph. You must call render_chart exactly once, then provide a normal final answer. Use graph for node-edge structures such as DFS or BFS demos, trees, state machines, and dependency graphs. Do not call render_chart more than once for the same request."
      : "";
    const sceneInstruction = shouldForceSceneTool
      ? "The user is explicitly asking for an interactive algorithm scene or step-by-step animation. You must call render_algorithm_scene exactly once, then provide a normal final answer. Prefer render_algorithm_scene over render_chart for DFS, BFS, traversal demos, or algorithm playback."
      : "";

    let systemPrompt = "";

    if (userId) {
      try {
        const [agentContext, memoryContext, knowledgeContext] = await Promise.all([
          this.agentService.assembleContext(userId, token),
          this.memoryService.buildMemoryContext(userId, latestUserText, token),
          this.ragService.buildKnowledgeContext(userId, latestUserText, token),
        ]);
        const knowledgeInstruction = knowledgeContext
          ? "If Relevant Knowledge Base is present and relevant, prioritize it over assumptions, and keep the answer grounded in that material."
          : "";
        console.log(
          "[ChatService] context summary:",
          JSON.stringify({
            hasAgentContext: Boolean(agentContext),
            hasMemoryContext: Boolean(memoryContext),
            hasKnowledgeContext: Boolean(knowledgeContext),
            knowledgeContextLength: knowledgeContext.length,
            latestUserText: latestUserText.slice(0, 200),
          }),
        );
        const extraInstructions = [chartInstruction, sceneInstruction]
          .filter(Boolean)
          .join("\n");

        systemPrompt = [
          knowledgeContext,
          knowledgeInstruction,
          agentContext,
          memoryContext,
          extraInstructions,
        ]
          .filter(Boolean)
          .join("\n\n");
      } catch (error) {
        console.error("[ChatService] failed to assemble agent context:", error);
      }
    }

    if (!systemPrompt) {
      systemPrompt = [chartInstruction, sceneInstruction].filter(Boolean).join("\n");
    }

    try {
      const result = streamText({
        model: deepseekProvider("deepseek-chat"),
        system: systemPrompt,
        messages,
        tools: allTools,
        toolChoice: "auto",
        maxSteps: shouldForceChartTool || shouldForceSceneTool ? 2 : 5,
      });

      console.log("[ChatService] streamText created");
      return result;
    } catch (error) {
      console.error("[ChatService] streamText failed:", error);
      throw error;
    }
  }
}
