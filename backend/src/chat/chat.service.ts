import { Injectable } from "@nestjs/common";
import { streamText, generateText } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { ToolRegistryService } from "./tool-registry.service";
import { McpClientService } from "./mcp-client.service";
import { AgentService } from "../agent/agent.service";

@Injectable()
export class ChatService {
  constructor(
    private readonly toolRegistry: ToolRegistryService,
    private readonly mcpClient: McpClientService,
    private readonly agentService: AgentService,
  ) {}

  async createChatStream(messages: any[], userId?: string, token?: string) {
    const deepseekProvider = createDeepSeek();

    const localTools = this.toolRegistry.getAllTools(userId, token);
    const externalTools = this.mcpClient.getExternalTools();
    const allTools = { ...localTools, ...externalTools };

    console.log(
      `[ChatService] 合并工具: 本地(${Object.keys(localTools).length}) + 远程(${Object.keys(externalTools).length})`,
    );

    let systemPrompt = ''
    if (userId) {
      try {
        const agentContext = await this.agentService.assembleContext(userId, token);
        if (agentContext) {
          // systemPrompt = `${agentContext}\n\n---\n\n${systemPrompt}`;
          systemPrompt = agentContext
        }else{
          systemPrompt = `你是一个全能的 AI 助手叫做 pulse,
当你获得工具返回的结果后，请务必结合这些真实信息（尤其是搜索到的实时信息），为用户提供一段周全、贴心且有深度的分析和建议。`;
        }
      } catch (error) {
        console.error("[ChatService] 组装 Agent 上下文失败:", error);
      }
    }

    try {
      console.log("[ChatService] 开始创建 streamText，消息数:", messages.length);
      console.log("[ChatService] systemPrompt 长度:", systemPrompt.length);
      console.log("[ChatService] 工具数量:", Object.keys(allTools).length);
      console.log("[ChatService] 最终 systemPrompt:", systemPrompt);
      const result = streamText({
        model: deepseekProvider("deepseek-chat"),
        system: systemPrompt,
        messages,
        tools: allTools,
        maxSteps: 5,
      });
      console.log("[ChatService] streamText 创建成功");
      return result;
    } catch (error) {
      console.error("[ChatService] streamText 执行失败:", error);
      throw error;
    }
  }

async summarizeConversation(messages: any[], existingMemory: string = ''): Promise<string | null> {
    if (!messages || messages.length === 0) {
      return null;
    }

    // 这里有个小优化：把 user 替换成“对方”，把 AI 替换成“PULSE”，能大大增加活人感
    const conversationText = messages
      .slice(-6)
      .map(m => `${m.role === 'user' ? '对方' : 'PULSE'}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
      .join('\n');

    const prompt = `
你是 PULSE 的“潜意识记忆中枢”。你的任务是阅读最新对话，并负责更新和维护 PULSE 的【长期记忆档案】。

【核心合并法则】（极其重要！）：
1. 绝对不要单纯堆砌！如果对话中出现了已有信息的补充（比如以前知道TA喜欢羽毛球，现在知道了预算和打法），请直接修改原有的记忆条目，**融合成一句信息量更大的话**，把旧的删掉。
2. 保持活人味！严禁使用“用户(User)”这个冷冰冰的词！必须使用“TA”或者对方的名字。语气要像活人写的“私密备忘录”，带点情绪和温度。
3. 无新信息保持静默：如果最新对话只是无意义闲聊、没有新增值得长期记忆的信息，必须严格返回 "NONE"。
4. 格式要求：如果档案有更新，请直接输出**完整更新后的记忆档案内容**（保留原有的 Markdown 标题和结构）。不要加任何解释。

【合并对比示例】：
❌ 错误（碎片化堆砌）：
- TA喜欢打羽毛球。
- TA是防守控制型打法。
- TA想买700元的球拍。
✅ 正确（完美融合）：
- TA 是个隐藏的羽毛球高手（偏防守控制型），最近打算买个700块左右的新拍子，下次可以问问TA看中哪款了~

===================
【当前记忆档案】：
${existingMemory || '空'}

【最新对话记录】：
${conversationText}

你的输出（完整的更新后档案，或严格输出 NONE）：
`.trim();

    try {
      const deepseekProvider = createDeepSeek();
      const result = await generateText({
        model: deepseekProvider("deepseek-chat"),
        messages: [{ role: 'user', content: prompt }],
      });

      // 清理可能带有的 markdown 代码块符号
      let summary = result.text.trim();
      summary = summary.replace(/^```markdown\n?/i, '').replace(/```$/i, '').trim();
      
      if (summary === 'NONE' || summary === existingMemory.trim()) {
        return null;
      }

      console.log('[ChatService] 对话摘要/记忆更新成功');
      return summary;
    } catch (error) {
      console.error('[ChatService] 摘要生成失败:', error);
      return null;
    }
  }
}
