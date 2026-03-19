export interface LocalMcpServerConfig {
  name: string;
  type?: "local";
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface RemoteMcpServerConfig {
  name: string;
  type: "remote";
  url: string;
}

export type McpServerConfig = LocalMcpServerConfig | RemoteMcpServerConfig;

export const MCP_SERVERS: McpServerConfig[] = [
  {
    name: "tavily-search",
    type: "local",
    command: process.platform === "win32" ? "cmd.exe" : "npx",
    args:
      process.platform === "win32"
        ? ["/c", "npx", "-y", "tavily-mcp"]
        : ["-y", "tavily-mcp"],
    env: process.env as Record<string, string>,
  },
  {
    name: "youtube-mcp",
    type: "remote",
    url: "https://youtube-mcp--sfiorini.run.tools",
  },
];
