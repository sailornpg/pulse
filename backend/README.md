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
├── rag/                       # RAG 知识库模块
│   ├── rag.controller.ts      # 知识库文档管理接口
│   ├── rag.service.ts         # 文档切块、向量索引、检索与上下文组装
│   └── rag.module.ts          # RAG 模块定义
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
EMBEDDING_API_KEY=optional_for_rag_and_memory_embeddings
EMBEDDING_MODEL=Qwen/Qwen3-Embedding-4B
EMBEDDING_BASE_URL=optional_openai_compatible_base_url_to_v1
EMBEDDING_DIMENSIONS=2560
OPENAI_API_KEY=optional_legacy_embedding_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=required_for_default_rag_documents
RAG_ADMIN_KEY=required_for_default_rag_documents_api
```

如果你要启用 RAG 或结构化记忆的语义召回，优先配置 `EMBEDDING_API_KEY`、`EMBEDDING_MODEL` 与可选的 `EMBEDDING_BASE_URL`。当前实现使用 OpenAI 兼容 embedding 接口，因此可以接 OpenAI，也可以接支持兼容协议的国内服务或自建推理服务。

推荐的 Qwen 方案：

```bash
# 例 1：使用 OpenAI 兼容网关 / 自建 vLLM / ModelScope Proxy 等
EMBEDDING_API_KEY=your_embedding_api_key
EMBEDDING_MODEL=Qwen/Qwen3-Embedding-4B
EMBEDDING_BASE_URL=https://your-openai-compatible-endpoint/v1
EMBEDDING_DIMENSIONS=2560

# 例 2：继续使用 OpenAI 老配置（向后兼容）
OPENAI_API_KEY=your_openai_api_key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSIONS=1536
```

如果你接的是特定托管平台，而它要求不同的模型 ID，例如某些平台使用 `text-embedding-v4`，只需要改 `EMBEDDING_MODEL`，代码不用再动。

注意：`EMBEDDING_BASE_URL` 要填写到服务根路径，例如 `https://api.siliconflow.cn/v1`，不要填写成完整的 `.../v1/embeddings`，因为 SDK 会自动拼接接口路径。

如果你切换了 embedding 模型，还要保证 Supabase 中 `rag_documents.embedding` 的向量维度一致。例如：

- `Qwen/Qwen3-Embedding-4B` 通常是 `2560` 维
- `text-embedding-3-small` 通常是 `1536` 维

当前项目默认 SQL 是 `1536` 维。如果你改用 Qwen，请额外执行：

```sql
\i sql/rag_documents_qwen_2560.sql
```

调试 RAG 召回时，还可以额外配置：

```bash
RAG_RETRIEVAL_MIN_SCORE=0.05
```

当前默认值就是 `0.05`。如果你发现文档已经入库，但提问时始终没有被注入，可以先观察后端日志里的 `retrieval summary` 和 `context summary`，再决定是否继续下调阈值。

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

-- 创建结构化记忆表
CREATE TABLE IF NOT EXISTS memory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  confidence DOUBLE PRECISION DEFAULT 0.7,
  source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  source_message_id UUID,
  embedding JSONB,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supersedes_id UUID REFERENCES memory_items(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_items_user_status
  ON memory_items(user_id, status, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_items_user_active_key
  ON memory_items(user_id, canonical_key)
  WHERE status = 'active';

ALTER TABLE memory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户只能管理自己的结构化记忆" ON memory_items
  FOR ALL USING (auth.uid() = user_id);
```

如果你要启用新的记忆链路，先执行 `sql/memory_items.sql`。

如果你要启用 RAG 知识库，再额外执行 `sql/rag_documents.sql`。

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

当用户已登录且知识库中存在相关文档时，后端会在生成答案前自动执行一次检索，并把命中的片段注入系统提示词中的 `Relevant Knowledge Base` 上下文块。

### 知识库接口

所有 RAG 接口都需要 Bearer Token。

#### `GET /rag/documents`
列出当前用户已索引的知识库文档摘要。可选 `?includeDefault=true` 一并返回默认共享文档。

#### `POST /rag/documents`
写入或覆盖一个知识库文档，并自动切块和建立向量索引。支持通过 `knowledgeBaseName` 指定目标知识库名称。

**请求体**
```json
{
  "documentId": "optional-doc-id",
  "knowledgeBaseName": "产品知识库",
  "title": "项目说明",
  "source": "README",
  "content": "这里是一整段要入库的知识内容",
  "tags": ["docs", "project"]
}
```

#### `GET /rag/knowledge-bases`
列出当前用户的知识库摘要。可选 `?includeDefault=true` 一并返回默认共享知识库。

#### `POST /rag/documents/upload`
使用 `multipart/form-data` 上传并索引文件到指定知识库。

**表单字段**
- `knowledgeBaseName`: 目标知识库名字
- `files`: 一个或多个文件

**支持格式**
- Markdown：`.md`, `.markdown`
- HTML：`.html`, `.htm`
- PDF：`.pdf`
- Text：`.txt`

#### `POST /rag/documents/import-url`
抓取一个 HTML 地址并解析正文，再写入指定知识库。

**请求体**
```json
{
  "url": "https://example.com/page.html",
  "title": "可选标题覆盖",
  "knowledgeBaseName": "网页资料库"
}
```

#### `DELETE /rag/documents/:documentId`
删除指定知识库文档及其所有切块。

### 默认共享知识库接口

这组接口用于维护所有用户都可读取的默认文档。它们不使用普通 Bearer Token，而是要求请求头 `x-rag-admin-key` 与 `RAG_ADMIN_KEY` 匹配，并且后端配置了 `SUPABASE_SERVICE_ROLE_KEY`。

#### `GET /rag/default-documents`
列出当前所有默认共享文档。

#### `POST /rag/default-documents`
写入或覆盖一个默认共享文档。

**请求体**
```json
{
  "documentId": "default_onboarding",
  "title": "平台默认说明",
  "source": "system",
  "content": "这里是所有用户都可检索到的默认知识内容",
  "tags": ["default", "onboarding"]
}
```

#### `DELETE /rag/default-documents/:documentId`
删除一个默认共享文档。

### 默认文档的检索行为

- 聊天时会优先检索当前用户自己的知识文档。
- 同时还会检索 `scope=default` 的默认共享文档。
- 两边结果会合并排序后注入 `Relevant Knowledge Base`，其中用户私有知识会有轻微优先级提升。
- URL 导入依赖后端运行环境具备对目标网页的网络访问能力；如果后端无法出网，`/rag/documents/import-url` 会失败。

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
