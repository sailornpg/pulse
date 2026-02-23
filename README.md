# Pulse AI

一个全栈 AI 对话应用，支持**实时联网搜索**、**多工具调用**、**流式顺序渲染**、**用户认证**和**会话历史记录**。后端基于 NestJS + Vercel AI SDK，通过 MCP 协议动态集成外部工具；前端基于 React + shadcn/ui，呈现极简现代化的对话体验。

## 效果预览

- 💬 流式 AI 对话，工具卡片与文本按逻辑顺序交织展示
- 🔍 Tavily 实时联网搜索，结果即时渲染
- 🃏 工具卡片支持展开/收起，自动折叠保持界面简洁
- 🔐 用户认证与授权，支持登录/注册
- 📝 会话历史记录，自动保存对话内容
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
- Supabase 项目（[创建地址](https://supabase.com)）

### 1. 配置 Supabase

创建 Supabase 项目后，执行以下 SQL 脚本创建必要的表：

```sql
-- 创建用户表（如果不存在）
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建会话表
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '新对话',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建消息表
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT,
  parts JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- 启用 RLS（行级安全）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 用户表策略
CREATE POLICY "用户只能查看自己的数据" ON users
  FOR SELECT USING (auth.uid()::text = id);

-- 会话表策略
CREATE POLICY "用户只能查看自己的会话" ON conversations
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "用户可以创建会话" ON conversations
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "用户可以更新自己的会话" ON conversations
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "用户可以删除自己的会话" ON conversations
  FOR DELETE USING (auth.uid()::text = user_id);

-- 消息表策略
CREATE POLICY "用户只能查看自己会话的消息" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()::text
    )
  );

CREATE POLICY "用户可以创建消息" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()::text
    )
  );

-- 创建 AI 灵魂文件表
CREATE TABLE IF NOT EXISTS agent_files (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content TEXT DEFAULT '',
  file_type TEXT DEFAULT 'general',
  is_system BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_agent_files_user_path ON agent_files(user_id, file_path);

-- 启用 RLS
ALTER TABLE agent_files ENABLE ROW LEVEL SECURITY;

-- AI 灵魂文件表策略
CREATE POLICY "用户只能管理自己的 AI 文件" ON agent_files
  FOR ALL USING (auth.uid()::text = user_id);
```

### 2. 启动后端

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
# 编辑 .env 文件，填写以下内容：
# DEEPSEEK_API_KEY=your_deepseek_api_key
# TAVILY_API_KEY=your_tavily_api_key
# SUPABASE_URL=your_supabase_project_url
# SUPABASE_ANON_KEY=your_supabase_anon_key

# 启动服务
npm run start
```

后端将在 **`http://localhost:3001`** 启动。

### 3. 启动前端

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
    │  AuthContext（用户认证状态）
    ▼
NestJS 后端 (localhost:3001)
    │  streamText（Vercel AI SDK）
    ├──► DeepSeek API（对话生成）
    ├──► MCP Client
    │       └──► tavily-mcp（实时搜索工具）
    └──► Supabase（用户认证与数据存储）
            ├── JWT 认证
            └── 会话历史记录
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
| 用户认证 | ✅ Supabase + JWT |
| 会话历史记录 | ✅ 自动保存 |
| 未登录用户支持 | ✅ 临时对话 |

## 功能特性

### 用户认证
- 基于 Supabase 的用户注册与登录
- JWT Token 认证与授权
- 登录状态持久化（localStorage）
- 支持未登录用户使用（不保存历史记录）

### 会话管理
- 自动创建新会话
- 会话列表展示与切换
- 会话标题自动生成（基于首条消息）
- 会话删除功能
- 消息历史加载

### 日志系统
- HTTP 请求日志（方法、URL、状态码、响应时间）
- 全局异常捕获与记录
- 结构化日志输出

## 详细文档

- [后端文档](./backend/README.md) - NestJS 服务、API 接口、工具体系、日志系统
- [前端文档](./frontend/README.md) - React 应用、认证流程、会话管理、组件说明

## 技术栈

**后端**：NestJS · Vercel AI SDK · DeepSeek · MCP SDK · Supabase · JWT · TypeScript

**前端**：React 18 · Vite · shadcn/ui · Framer Motion · Tailwind CSS · ai/react · Supabase
