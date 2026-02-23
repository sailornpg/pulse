import { Controller, Post, Body, Res, Request, Headers } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { Response } from "express";
import { HistoryService } from "../history/history.service";
import { SupabaseService } from "../supabase/supabase.service";
import { AgentService } from "../agent/agent.service";

@Controller("chat")
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly historyService: HistoryService,
    private readonly supabase: SupabaseService,
    private readonly agentService: AgentService,
  ) { }

  private async extractUserFromToken(authHeader?: string): Promise<{ id: string; email: string } | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.replace('Bearer ', '');
    try {
      const user = await this.supabase.getUserFromToken(token);
      return user ? { id: user.id, email: user.email || '' } : null;
    } catch {
      return null;
    }
  }

  @Post()
  async chat(
    @Body("messages") messages: any[],
    @Body("conversationId") conversationId: string | null,
    @Request() req: any,
    @Headers("authorization") authHeader: string,
    @Res() res: Response
  ) {
    const user = await this.extractUserFromToken(authHeader);
    const userId = user?.id;
    const token = authHeader?.replace('Bearer ', '');
    console.log(`[API] 收到聊天请求，消息数量: ${messages?.length}, 用户: ${userId || '未登录'}`);

    let convId = conversationId;

    try {
      if (userId) {
        // 获取数据库中已有消息数量（如果会话存在）
        let existingCount = 0;
        if (convId) {
          try {
            const existingMessages = await this.historyService.getMessages(convId, userId, token);
            existingCount = existingMessages.length;
          } catch (e) {
            console.log('[API] 会话不存在，将创建新会话');
            convId = null;
          }
        }

        if (!convId) {
          const newConv = await this.historyService.createConversation(userId, "新对话", token);
          convId = newConv.id;
          console.log(`[API] 创建新会话: ${convId}`);
        }

        // 只保存新增的消息（从已有数量开始）
        const newMessages = messages.slice(existingCount);
        for (const msg of newMessages) {
          await this.historyService.addMessage(convId, userId, msg.role, msg.content, msg.parts || null, token);
        }
        console.log(`[API] 保存${newMessages.length}条新消息`);
      }

      // 过滤掉 role 为 'tool' 的消息，Vercel AI SDK 不支持
      const filteredMessages = messages.filter(m => m.role !== 'tool');
      const result = await this.chatService.createChatStream(filteredMessages, userId, token);

      console.log("[API] 成功创建流，开始传输...");
      console.log("[API] result 类型:", typeof result);
      console.log("[API] result 是否有 pipeDataStreamToResponse:", typeof result?.pipeDataStreamToResponse);

      if (!result || !result.pipeDataStreamToResponse) {
        console.error("[API] result 无效或没有 pipeDataStreamToResponse 方法");
        return res.status(500).json({ error: "Stream creation failed" });
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      if (convId) {
        res.setHeader('X-Conversation-Id', convId);
      }
      result.pipeDataStreamToResponse(res);

      res.on("finish", async () => {
        try {
          if (userId && convId) {
             // 1. 获取所有步骤 (steps) 而不是简单的 messages
      // steps 包含了每一轮生成的文本、工具调用及其结果
      const stepsRes = await result.steps;
      
      const uiParts = [];
      let fullCombinedContent = "";

      // 2. 遍历步骤，将其转换为前端完全一致的 parts 结构
      for (const step of stepsRes) {
        // 添加步骤开始标记 (对应你截图中的 step-start)
        uiParts.push({ type: 'step-start' });

        // 如果该步骤有文本，添加文本部分
        if (step.text) {
          uiParts.push({ type: 'text', text: step.text });
          fullCombinedContent += step.text;
        }

        // 如果该步骤有工具调用，将调用和结果合并为 tool-invocation
        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const toolCall of step.toolCalls) {
            // 找到对应的结果
            const toolResult = step.toolResults.find(r => r.toolCallId === toolCall.toolCallId);
            
            uiParts.push({
              type: 'tool-invocation',
              // 关键：这里构造与前端 useChat 完全一致的嵌套结构
              toolInvocation: {
                state: 'result', // 既然是在 finish 阶段，状态肯定是 result
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                args: toolCall.args,
                result: toolResult ? toolResult.result : undefined,
              }
            });
          }
        }
      }

      console.log('[API] 聚合后的聚合 Parts 数量:', uiParts.length);

      // 3. 将整个聚合后的结果存为一条 assistant 消息
      // 这样前端拉取历史记录时，一条消息就能显示完整的推理过程
      await this.historyService.addMessage(
        convId,
        userId,
        "assistant",
        fullCombinedContent, // 纯文本摘要
        uiParts,            // 完整的前端格式 parts 数组
        token
      );
            const lastMsg = filteredMessages[filteredMessages.length - 1];
            if (lastMsg?.role === "user") {
              const title = lastMsg.content?.substring(0, 30) || "新对话";
              await this.historyService.updateConversationTitle(convId, userId, title, token);
            }

            setTimeout(async () => {
              try {
                // 1. 先获取当前的记忆内容
                const memoryFile = await this.agentService.getFile(userId, 'memory.md', token);
                const existingMemory = memoryFile?.content || '';

                // 2. 把当前记忆连同对话一起传给 AI，进行“记忆合并提取”
                const updatedMemory = await this.chatService.summarizeConversation(messages, existingMemory);

                // 3. 如果有更新（不是 NONE），直接用新内容覆盖原文件！
                if (updatedMemory && updatedMemory !== 'NONE') {
                  await this.agentService.updateFile(userId, 'memory.md', updatedMemory, '记忆碎片合并与重写', token);
                  console.log('[Agent] 潜意识记忆整合完成！', updatedMemory);
                }
              } catch (e) {
                console.error('[Agent] 静默学习失败:', e);
              }
            }, 1000);
          }
        } catch (e) {
          console.error("[API] 保存回复消息失败:", e);
        }
      });
    } catch (error) {
      console.error("[API] 接口报错:", error);
      res.status(500).json({ error: error.message || "Chat error" });
    }
  }
}
