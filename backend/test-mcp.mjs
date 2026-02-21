import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: process.platform === "win32" ? "cmd.exe" : "npx",
    args:
      process.platform === "win32"
        ? ["/c", "npx", "-y", "tavily-mcp"]
        : ["-y", "tavily-mcp"],
    env: process.env,
  });

  const client = new Client(
    { name: "demo", version: "1" },
    { capabilities: {} },
  );
  await client.connect(transport);
  const response = await client.listTools();
  console.log(JSON.stringify(response.tools, null, 2));
  process.exit(0);
}
main().catch(console.error);
