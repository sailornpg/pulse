import { Controller, Post, Body, Res } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { Response } from "express";

@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body("messages") messages: any[], @Res() res: Response) {
    console.log(`[API] 收到聊天请求，消息数量: ${messages?.length}`);
    try {
      const result = await this.chatService.createChatStream(messages);

      console.log("[API] 成功创建流，开始传输...");
      // 使用 AI SDK 提供的辅助函数将流式数据发送回前端
      result.pipeDataStreamToResponse(res);
    } catch (error) {
      console.error("[API] 接口报错:", error);
      res.status(500).json({ error: error.message || "Chat error" });
    }
  }
}
