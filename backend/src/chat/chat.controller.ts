import { Controller, Post, Body, Res, Request, Headers } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { Response } from "express";
import { HistoryService } from "../history/history.service";
import { SupabaseService } from "../supabase/supabase.service";

@Controller("chat")
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly historyService: HistoryService,
    private readonly supabase: SupabaseService
  ) {}

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
        if (!convId) {
          const newConv = await this.historyService.createConversation(userId, "新对话", token);
          convId = newConv.id;
          console.log(`[API] 创建新会话: ${convId}`);
        }

        for (const msg of messages) {
          await this.historyService.addMessage(convId, userId, msg.role, msg.content, msg.parts || null, token);
        }
      }

      const result = await this.chatService.createChatStream(messages);
      
      console.log("[API] 成功创建流，开始传输...");

      result.pipeDataStreamToResponse(res);

      res.on("finish", async () => {
        try {
          const fullResponse = await result.text;
          console.log("[API] AI 完整回复:", fullResponse.substring(0, 100) + "...");
          
          if (userId && convId && fullResponse) {
            await this.historyService.addMessage(convId, userId, "assistant", fullResponse, null, token);
            
            const lastMsg = messages[messages.length - 1];
            if (lastMsg?.role === "user") {
              const title = lastMsg.content?.substring(0, 30) || "新对话";
              await this.historyService.updateConversationTitle(convId, userId, title, token);
            }
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
