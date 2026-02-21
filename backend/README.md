# Pulse AI — 后端服务

基于 **NestJS** 构建的 AI 对话后端，集成了 Vercel AI SDK 实现流式文本生成，并通过 **MCP（Model Context Protocol）** 协议动态加载外部工具。

## 技术栈

| 分类 | 技术 |
|---|---|
| 框架 | NestJS 10 |
| AI SDK | Vercel AI SDK 4.x (`ai`) |
| AI 模型 | DeepSeek (`@ai-sdk/deepseek`) |
| 工具协议 | MCP SDK (`@modelcontextprotocol/sdk`) |
| 语言 | TypeScript 5 |

## 项目结构

```
backend/src/
├── main.ts                     # 入口，开启 CORS，监听 3001 端口
├── app.module.ts               # 根模块
└── chat/
    ├── chat.controller.ts      # POST /chat — 接收消息，返回 AI 流
    ├── chat.service.ts         # 调用 AI SDK，合并工具，驱动 streamText
    ├── mcp-client.service.ts   # MCP 客户端，连接外部工具服务器
    ├── mcp.config.ts           # MCP 服务器配置列表
    └── tool-registry.service.ts # 本地工具注册表
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env` 示例并填写密钥：

```bash
# .env
DEEPSEEK_API_KEY=your_deepseek_api_key
TAVILY_API_KEY=your_tavily_api_key
```

### 3. 启动服务

```bash
# 生产模式
npm run start

# 开发模式（热重载）
npm run start:dev
```

服务启动后监听 **`http://localhost:3001`**。

## API 接口

### `POST /chat`

接收对话消息，返回 AI 流式响应（`text/plain` data stream）。

**请求体**

```json
{
  "messages": [
    { "role": "user", "content": "帮我查一下北京天气" }
  ]
}
```

**响应**

AI SDK 格式的流式文本，供前端 `useChat` hook 消费。

## 工具体系

### 本地工具（`src/tools/`）

| 工具名 | 描述 |
|---|---|
| `getWeather` | 获取指定城市天气（模拟） |
| `getCurrentTime` | 获取当前时间 |
| `calculate` | 数学表达式计算 |

### 外部 MCP 工具

通过 `mcp.config.ts` 配置，目前集成了：

| 服务器 | 工具 | 描述 |
|---|---|---|
| `tavily-search` | `tavily_search`, `tavily_research` | 基于 Tavily 的实时联网搜索 |

### 添加更多 MCP 工具

编辑 `src/chat/mcp.config.ts`，在 `MCP_SERVERS` 数组中追加配置：

```ts
{
  name: 'github-tools',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-github'],
  env: { ...process.env, GITHUB_PERSONAL_ACCESS_TOKEN: 'xxx' } as any,
}
```

## 核心配置

- **模型**：`deepseek-chat`（可在 `chat.service.ts` 中替换为其他支持 AI SDK 的模型）
- **最大工具调用步骤**：5（`maxSteps: 5`）
- **系统提示词**：在 `chat.service.ts` 的 `system` 字段中修改
