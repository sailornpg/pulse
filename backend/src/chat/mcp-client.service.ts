import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { jsonSchema } from "ai";
import { MCP_SERVERS, McpServerConfig } from "./mcp.config";
import { createConnection } from "@smithery/api/mcp"; // 导入 smithery 辅助工具
// 修改为通用的 Transport 类型
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

@Injectable()
export class McpClientService implements OnModuleInit, OnModuleDestroy {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, Transport> = new Map();
  private externalTools: any = {};
  private initializedServers: string[] = [];

  async onModuleInit() {
    console.log("[MCP] 正在初始化 MCP 客户端集群...");

    for (const config of MCP_SERVERS) {
      await this.initMcpServer(config);
    }

    if (this.initializedServers.length > 0) {
      console.log(
        `[MCP] 初始化完成。已连接服务: ${this.initializedServers.join(", ")}`,
      );
      console.log(
        `[MCP] 已加载工具总数: ${Object.keys(this.externalTools).length}`,
      );
    } else {
      console.warn("[MCP] 未成功初始化任何 MCP 服务。");
    }
  }

  private async initMcpServer(config: McpServerConfig) {
    console.log(`[MCP] 正在连接服务器: ${config.name}...`);

    try {
      let transport;

      if (config.type === 'remote') {
        // --- 接入远程 YouTube API 逻辑 ---
        console.log(`[MCP] 使用远程连接: ${config.url}`);
        const connection = await createConnection({
          mcpUrl: config.url,
        });
        transport = connection.transport;
      } else {
        // --- 原有的本地 npx 逻辑 ---
        transport = new StdioClientTransport({
          command: config.command!,
          args: config.args!,
          env: config.env || (process.env as Record<string, string>),
        });
      }

      const client = new Client(
        { name: "pulse-client-mcp", version: "1.0.0" },
        { capabilities: {} },
      );

      await client.connect(transport);

      // 注册工具
      const response = await client.listTools();
      // 注册工具逻辑 (这部分是通用的，不需要改动)
      response.tools.forEach((mcpTool) => {
        // 注意：如果多个 MCP server 有同名工具，这里会被覆盖
        // 建议给工具名加前缀，例如 `${config.name}__${mcpTool.name}`
        const toolKey = `${mcpTool.name}`; 
        
        this.externalTools[toolKey] = {
          description: mcpTool.description,
          parameters: jsonSchema(mcpTool.inputSchema as any),
          execute: async (args: any) => {
            console.log(`[MCP] [${config.name}] 调用工具: ${mcpTool.name}`, args);
            const result = await client.callTool({
              name: mcpTool.name,
              arguments: args,
            });
            return result.content;
          },
        };
      });

      this.transports.set(config.name, transport);
      this.clients.set(config.name, client);
      this.initializedServers.push(config.name);

      console.log(
        `[MCP] 服务器 ${config.name} 连接成功，加载了 ${response.tools.length} 个工具。`,
      );
    } catch (error) {
      console.error(`[MCP] 服务器 ${config.name} 连接失败:`, error.message);
    }
  }

  async onModuleDestroy() {
    console.log("[MCP] 正在关闭所有 MCP 连接...");
    for (const [name, transport] of this.transports.entries()) {
      try {
        await transport.close();
        console.log(`[MCP] 已关闭服务连接: ${name}`);
      } catch (err) {
        console.error(`[MCP] 关闭服务 ${name} 出错:`, err.message);
      }
    }
  }

  getExternalTools() {
    return this.externalTools;
  }

  status() {
    return this.initializedServers.length > 0;
  }

  getInitializedServers() {
    return this.initializedServers;
  }
}
