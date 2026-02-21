# Pulse AI

一个全栈 AI 对话应用，支持**实时联网搜索**、**多工具调用**和**流式顺序渲染**。后端基于 NestJS + Vercel AI SDK，通过 MCP 协议动态集成外部工具；前端基于 React + shadcn/ui，呈现极简现代化的对话体验。

## 效果预览

- 💬 流式 AI 对话，工具卡片与文本按逻辑顺序交织展示
- 🔍 Tavily 实时联网搜索，结果即时渲染
- 🃏 工具卡片支持展开/收起，自动折叠保持界面简洁
- 🎨 极简深色 UI，Framer Motion 动画

## 项目结构

```
ai-outline/
├── backend/     # NestJS + AI SDK + MCP 工具服务
└── frontend/    # React + Vite + shadcn/ui 对话界面
```

## 快速开始

### 前置要求

- Node.js >= 18
- DeepSeek API Key（[申请地址](https://platform.deepseek.com)）
- Tavily API Key（[申请地址](https://app.tavily.com)）

### 1. 启动后端

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
# 编辑 .env 文件，填写以下内容：
# DEEPSEEK_API_KEY=your_deepseek_api_key
# TAVILY_API_KEY=your_tavily_api_key

# 启动服务
npm run start
```

后端将在 **`http://localhost:3001`** 启动。

### 2. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端将在 **`http://localhost:3000`** 启动，在浏览器中打开即可开始对话。

## 架构概览

```
浏览器 (React)
    │  useChat hook（AI SDK 流式协议）
    ▼
NestJS 后端 (localhost:3001)
    │  streamText（Vercel AI SDK）
    ├──► DeepSeek API（对话生成）
    └──► MCP Client
              │
              └──► tavily-mcp（实时搜索工具）
```

## AI 能力

| 能力 | 支持 |
|---|---|
| 流式对话 | ✅ |
| 联网搜索 | ✅ Tavily |
| 天气查询 | ✅ 模拟数据 |
| 时间查询 | ✅ |
| 数学计算 | ✅ |
| 多步工具调用（最多 5 步） | ✅ |

## 详细文档

- [后端文档](./backend/README.md)
- [前端文档](./frontend/README.md)

## 扩展 MCP 工具

在 `backend/src/chat/mcp.config.ts` 的 `MCP_SERVERS` 数组中追加配置即可接入任意 MCP 兼容的工具服务器，无需修改核心业务逻辑。

## 技术栈

**后端**：NestJS · Vercel AI SDK · DeepSeek · MCP SDK · TypeScript

**前端**：React 18 · Vite · shadcn/ui · Framer Motion · Tailwind CSS · ai/react
