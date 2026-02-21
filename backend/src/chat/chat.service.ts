import { Injectable } from "@nestjs/common";
import { streamText } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { ToolRegistryService } from "./tool-registry.service";
import { McpClientService } from "./mcp-client.service";

@Injectable()
export class ChatService {
  constructor(
    private readonly toolRegistry: ToolRegistryService,
    private readonly mcpClient: McpClientService,
  ) {}

  async createChatStream(messages: any[]) {
    const deepseekProvider = createDeepSeek({
      // 默认会读取 DEEPSEEK_API_KEY 环境变量
    });

    const localTools = this.toolRegistry.getAllTools();
    const externalTools = this.mcpClient.getExternalTools();
    const allTools = { ...localTools, ...externalTools };

    console.log(
      `[ChatService] 合并工具: 本地(${Object.keys(localTools).length}) + 远程(${Object.keys(externalTools).length})`,
    );

    try {
      const result = streamText({
        model: deepseekProvider("deepseek-chat"),
        system: `你是一个全能的 AI 助手，具备查天气、看时间、做计算以及【联网搜索】的能力。
当你获得工具返回的结果后，请务必结合这些真实信息（尤其是搜索到的实时信息），为用户提供一段周全、贴心且有深度的分析和建议。`,
        messages,
        tools: allTools,
        maxSteps: 5,
      });
      return result;
    } catch (error) {
      console.error("[ChatService] Error:", error);
      throw error;
    }
  }
}
