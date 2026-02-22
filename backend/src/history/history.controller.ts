import { Controller, Get, Post, Delete, Put, Body, Param, UseGuards, Request, Headers } from "@nestjs/common";
import { HistoryService, Conversation, Message } from "./history.service";
import { JwtAuthGuard } from "../auth/jwt.guard";

@Controller("history")
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  private getToken(headers: any): string | undefined {
    const auth = headers.authorization;
    return auth?.startsWith('Bearer ') ? auth.replace('Bearer ', '') : undefined;
  }

  @Get("conversations")
  async getConversations(@Request() req: any, @Headers() headers: any): Promise<Conversation[]> {
    const token = this.getToken(headers);
    return this.historyService.getConversations(req.user.id, token);
  }

  @Post("conversations")
  async createConversation(@Request() req: any, @Body("title") title?: string, @Headers() headers?: any): Promise<Conversation> {
    const token = this.getToken(headers);
    return this.historyService.createConversation(req.user.id, title, token);
  }

  @Get("conversations/:id/messages")
  async getMessages(@Param("id") id: string, @Request() req: any, @Headers() headers: any): Promise<Message[]> {
    const token = this.getToken(headers);
    return this.historyService.getMessages(id, req.user.id, token);
  }

  @Post("conversations/:id/messages")
  async addMessage(
    @Param("id") id: string,
    @Request() req: any,
    @Body() body: { role: string; content: string; parts?: any },
    @Headers() headers: any
  ): Promise<Message> {
    const token = this.getToken(headers);
    return this.historyService.addMessage(
      id,
      req.user.id,
      body.role,
      body.content,
      body.parts,
      token
    );
  }

  @Put("conversations/:id")
  async updateConversationTitle(
    @Param("id") id: string,
    @Request() req: any,
    @Body("title") title: string,
    @Headers() headers: any
  ): Promise<Conversation> {
    const token = this.getToken(headers);
    return this.historyService.updateConversationTitle(id, req.user.id, title, token);
  }

  @Delete("conversations/:id")
  async deleteConversation(@Param("id") id: string, @Request() req: any, @Headers() headers: any): Promise<{ success: boolean }> {
    const token = this.getToken(headers);
    await this.historyService.deleteConversation(id, req.user.id, token);
    return { success: true };
  }
}
