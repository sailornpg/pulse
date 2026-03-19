import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { ToolRegistryService } from "./tool-registry.service";
import { McpClientService } from "./mcp-client.service";
import { HistoryModule } from "../history/history.module";
import { SupabaseModule } from "../supabase/supabase.module";
import { AgentModule } from "../agent/agent.module";
import { RagModule } from "../rag/rag.module";

@Module({
  imports: [HistoryModule, SupabaseModule, AgentModule, RagModule],
  controllers: [ChatController],
  providers: [ChatService, ToolRegistryService, McpClientService],
})
export class ChatModule {}
