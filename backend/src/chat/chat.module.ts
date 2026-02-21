import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { ToolRegistryService } from "./tool-registry.service";
import { McpClientService } from "./mcp-client.service";

@Module({
  controllers: [ChatController],
  providers: [ChatService, ToolRegistryService, McpClientService],
})
export class ChatModule {}
