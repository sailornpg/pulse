export interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export const MCP_SERVERS: McpServerConfig[] = [
  {
    name: "tavily-search",
    command: process.platform === "win32" ? "cmd.exe" : "npx",
    args:
      process.platform === "win32"
        ? ["/c", "npx", "-y", "tavily-mcp"]
        : ["-y", "tavily-mcp"],
    env: process.env as Record<string, string>,
  },
  // 您可以在此处轻松添加更多 MCP 服务器，例如：
  /*
  {
    name: 'github-tools',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { ...process.env, GITHUB_PERSONAL_ACCESS_TOKEN: 'xxx' } as any,
  }
  */
];
