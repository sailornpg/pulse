# Pulse AI — 后端服务

基于 **NestJS** 构建的 AI 对话后端，集成了 Vercel AI SDK 实现流式文本生成，通过 **MCP（Model Context Protocol）** 协议动态加载外部工具，并支持用户认证与会话历史记录。

## 技术栈

| 分类 | 技术 |
|---|---|
| 框架 | NestJS 10 |
| AI SDK | Vercel AI SDK 4.x (`ai`) |
| AI 模型 | DeepSeek (`@ai-sdk/deepseek`) |
| 工具协议 | MCP SDK (`@modelcontextprotocol/sdk`) |
| 认证 | Supabase + JWT |
| 数据库 | Supabase (PostgreSQL) |
| 语言 | TypeScript 5 |

## 项目结构

```
backend/src/
├── main.ts                     # 入口，开启 CORS，监听 3001 端口
├── app.module.ts               # 根模块
├── auth/                      # 认证模块
│   ├── auth.controller.ts      # 登录/注册接口
│   ├── auth.service.ts         # Supabase 认证服务
│   ├── jwt-auth.service.ts     # JWT Token 验证
│   ├── jwt.guard.ts           # JWT 认证守卫
│   └── auth.module.ts         # 认证模块定义
├── chat/                      # AI 对话服务
│   ├── chat.controller.ts      # POST /chat — 接收消息，返回 AI 流
│   ├── chat.service.ts         # 调用 AI SDK，合并工具，驱动 streamText
│   ├── mcp-client.service.ts   # MCP 客户端，连接外部工具服务器
│   ├── mcp.config.ts           # MCP 服务器配置列表
│   └── tool-registry.service.ts # 本地工具注册表
├── history/                   # 会话历史记录服务
│   ├── history.controller.ts   # 会话与消息 CRUD 接口
│   ├── history.service.ts      # 历史记录业务逻辑
│   └── history.module.ts      # 历史记录模块定义
├── supabase/                  # Supabase 集成
│   ├── supabase.service.ts    # Supabase 客户端封装
│   └── supabase.module.ts    # Supabase 模块定义
└── common/                    # 公共模块
    ├── interceptors/
    │   └── logging.interceptor.ts  # HTTP 请求日志拦截器
    ├── filters/
    │   └── exception.filter.ts     # 全局异常过滤器
    └── logger/
        └── logger.service.ts       # 自定义日志服务
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
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 配置 Supabase 数据库

创建 Supabase 项目后，在 SQL Editor 中执行以下脚本：

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

### 4. 启动服务

```bash
# 生产模式
npm run start

# 开发模式（热重载）
npm run start:dev
```

服务启动后监听 **`http://localhost:3001`**。

## API 接口

### 认证接口

#### `POST /auth/register`
用户注册

**请求体**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**
```json
{
  "access_token": "jwt_token",
  "user": {
    "id": "user_id",
    "email": "user@example.com"
  }
}
```

#### `POST /auth/login`
用户登录

**请求体**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**
```json
{
  "access_token": "jwt_token",
  "user": {
    "id": "user_id",
    "email": "user@example.com"
  }
}
```

### 对话接口

#### `POST /chat`
接收对话消息，返回 AI 流式响应（`text/plain` data stream）。

**请求头**
```
Authorization: Bearer <jwt_token>  // 可选，未登录用户可使用
```

**请求体**
```json
{
  "messages": [
    { "role": "user", "content": "帮我查一下北京天气" }
  ],
  "conversationId": "conversation_id"  // 可选，用于继续会话
}
```

**响应**
AI SDK 格式的流式文本，供前端 `useChat` hook 消费。

### 历史记录接口

所有历史记录接口都需要 JWT 认证。

#### `GET /history/conversations`
获取用户的所有会话

**响应**
```json
[
  {
    "id": "conversation_id",
    "title": "会话标题",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### `POST /history/conversations`
创建新会话

**请求体**
```json
{
  "title": "新对话"
}
```

**响应**
```json
{
  "id": "conversation_id",
  "title": "新对话",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### `GET /history/conversations/:id/messages`
获取指定会话的消息

**响应**
```json
[
  {
    "id": "message_id",
    "conversation_id": "conversation_id",
    "role": "user",
    "content": "消息内容",
    "parts": null,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### `POST /history/conversations/:id/messages`
向会话添加消息

**请求体**
```json
{
  "role": "user",
  "content": "消息内容",
  "parts": null
}
```

#### `PUT /history/conversations/:id`
更新会话标题

**请求体**
```json
{
  "title": "新标题"
}
```

#### `DELETE /history/conversations/:id`
删除会话

**响应**
```json
{
  "success": true
}
```

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

## 日志系统

### HTTP 请求日志
自动记录所有 HTTP 请求，包含：
- 请求方法（GET/POST/PUT/DELETE）
- 请求 URL
- 响应状态码
- 响应时间
- 客户端 IP
- User-Agent

### 全局异常捕获
捕获所有未处理的异常，记录：
- 错误信息
- 错误堆栈
- 请求上下文
- 统一的错误响应格式

### 日志级别
- `DEBUG` - 调试信息
- `INFO` - 一般信息
- `WARN` - 警告信息
- `ERROR` - 错误信息

## 核心配置

- **模型**：`deepseek-chat`（可在 `chat.service.ts` 中替换为其他支持 AI SDK 的模型）
- **最大工具调用步骤**：5（`maxSteps: 5`）
- **系统提示词**：在 `chat.service.ts` 的 `system` 字段中修改
- **JWT 过期时间**：在 `auth.service.ts` 中配置

## 安全特性

- **JWT 认证**：所有需要认证的接口使用 JWT 守卫保护
- **RLS 策略**：Supabase 行级安全确保用户只能访问自己的数据
- **密码加密**：使用 Supabase 内置的密码加密机制
- **CORS 配置**：允许前端跨域访问
