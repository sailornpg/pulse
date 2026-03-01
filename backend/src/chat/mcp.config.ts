// export interface McpServerConfig {
//   name: string;
//   command: string;
//   args: string[];
//   env?: Record<string, string>;
// }
export interface McpServerConfig {
  name: string;
  type: 'stdio' | 'remote'; // 新增类型区分
  // 本地服务配置
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // 远程服务配置
  url?: string; 
}
export const MCP_SERVERS: McpServerConfig[] = [
  {
    name: "tavily-search",
    type: 'stdio',
    command: process.platform === "win32" ? "cmd.exe" : "npx",
    args:
      process.platform === "win32"
        ? ["/c", "npx", "-y", "tavily-mcp"]
        : ["-y", "tavily-mcp"],
    env: process.env as Record<string, string>,
  },
  {
    name: "youtube-mcp",
    type: 'remote',
    url: "https://youtube-mcp--sfiorini.run.tools",
  }
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
