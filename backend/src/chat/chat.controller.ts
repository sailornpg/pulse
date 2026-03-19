import { Body, Controller, Headers, Post, Request, Res } from "@nestjs/common";
import { pipeDataStreamToResponse } from "ai";
import { Response } from "express";
import { MemoryService } from "../agent/memory.service";
import { HistoryService } from "../history/history.service";
import { SupabaseService } from "../supabase/supabase.service";
import { ChatService } from "./chat.service";

@Controller("chat")
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly historyService: HistoryService,
    private readonly supabase: SupabaseService,
    private readonly memoryService: MemoryService,
  ) {}

  private async extractUserFromToken(
    authHeader?: string,
  ): Promise<{ id: string; email: string } | null> {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.replace("Bearer ", "");

    try {
      const user = await this.supabase.getUserFromToken(token);
      return user ? { id: user.id, email: user.email || "" } : null;
    } catch {
      return null;
    }
  }

  @Post()
  async chat(
    @Body("messages") messages: any[],
    @Body("conversationId") conversationId: string | null,
    @Request() _req: unknown,
    @Headers("authorization") authHeader: string,
    @Res() res: Response,
  ) {
    const user = await this.extractUserFromToken(authHeader);
    const userId = user?.id;
    const token = authHeader?.replace("Bearer ", "");

    console.log(
      `[API] chat request received, messages=${messages?.length ?? 0}, user=${userId ?? "anonymous"}`,
    );

    let convId = conversationId;

    try {
      if (userId) {
        let existingCount = 0;
        const persistableMessages = messages.filter(
          (message) =>
            message?.role === "user" || message?.role === "assistant",
        );

        if (convId) {
          try {
            const existingMessages = await this.historyService.getMessages(
              convId,
              userId,
              token,
            );
            existingCount = existingMessages.length;
          } catch {
            console.log("[API] conversation missing, creating a new one");
            convId = null;
          }
        }

        if (!convId) {
          const newConv = await this.historyService.createConversation(
            userId,
            "新对话",
            token,
          );
          convId = newConv.id;
          console.log(`[API] created conversation ${convId}`);
        }

        const newMessages = persistableMessages.slice(existingCount);
        for (const msg of newMessages) {
          await this.historyService.addMessage(
            convId,
            userId,
            msg.role,
            msg.content,
            msg.parts || null,
            token,
          );
        }

        console.log(`[API] saved ${newMessages.length} new messages`);
      }

      const filteredMessages = messages.filter(
        (message) =>
          message.role === "user" || message.role === "assistant" || message.role === "system",
      );
      let result: Awaited<ReturnType<ChatService["createChatStream"]>> | null =
        null;

      pipeDataStreamToResponse(res, {
        headers: convId ? { "X-Conversation-Id": convId } : undefined,
        execute: async (dataStream) => {
          result = await this.chatService.createChatStream(
            filteredMessages,
            userId,
            token,
            (event) => dataStream.writeData(event),
            (event) => dataStream.writeData(event),
          );

          if (!result) {
            throw new Error("Stream creation failed");
          }

          result.mergeIntoDataStream(dataStream);
        },
        onError: (error) => {
          console.error("[API] data stream error:", error);
          return "Stream error";
        },
      });

      res.on("finish", async () => {
        try {
          if (!(userId && convId && result)) {
            return;
          }

          const stepsRes = await result.steps;
          const uiParts: any[] = [];
          let fullCombinedContent = "";

          for (const step of stepsRes) {
            uiParts.push({ type: "step-start" });

            if (step.text) {
              uiParts.push({ type: "text", text: step.text });
              fullCombinedContent += step.text;
            }

            if (step.toolCalls && step.toolCalls.length > 0) {
              for (const toolCall of step.toolCalls) {
                const toolResult = step.toolResults.find(
                  (entry) => entry.toolCallId === toolCall.toolCallId,
                );

                uiParts.push({
                  type: "tool-invocation",
                  toolInvocation: {
                    state: "result",
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    args: toolCall.args,
                    result: toolResult ? toolResult.result : undefined,
                  },
                });
              }
            }
          }

          await this.historyService.addMessage(
            convId,
            userId,
            "assistant",
            fullCombinedContent,
            uiParts,
            token,
          );

          const lastMsg = filteredMessages[filteredMessages.length - 1];
          if (lastMsg?.role === "user") {
            const title = lastMsg.content?.substring(0, 30) || "新对话";
            await this.historyService.updateConversationTitle(
              convId,
              userId,
              title,
              token,
            );
          }

          setTimeout(async () => {
            try {
              const recentMessages = await this.historyService.getRecentMessages(
                convId,
                userId,
                12,
                token,
              );
              await this.memoryService.learnFromConversation(
                userId,
                convId,
                recentMessages,
                token,
              );
            } catch (error) {
              console.error("[Agent] memory update failed:", error);
            }
          }, 0);
        } catch (error) {
          console.error("[API] failed to persist assistant message:", error);
        }
      });
    } catch (error: any) {
      console.error("[API] chat handler error:", error);
      res.status(500).json({ error: error.message || "Chat error" });
    }
  }
}
