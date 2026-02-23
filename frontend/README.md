# Pulse AI — 前端应用

基于 **React + Vite** 构建的现代化 AI 对话界面，采用极简深色设计风格，集成 shadcn/ui 组件库和 Framer Motion 动画，支持工具调用的顺序流式渲染、用户认证与会话历史记录。

## 技术栈

| 分类 | 技术 |
|---|---|
| 框架 | React 18 + Vite 5 |
| AI 流式状态 | Vercel AI SDK — `ai/react` (`useChat`) |
| UI 组件库 | shadcn/ui (New York 风格) |
| 动画 | Framer Motion 12 |
| 样式 | Tailwind CSS 3 |
| 图标 | Lucide React |
| Markdown 渲染 | react-markdown |
| 认证 | Supabase |
| 语言 | TypeScript 5 |

## 项目结构

```
frontend/src/
├── App.tsx                     # 主应用：布局、useChat、输入框
├── index.css                   # 全局样式：Tailwind 配置、滚动条、Markdown
├── main.tsx                    # React 挂载入口
├── contexts/                   # 认证上下文
│   └── AuthContext.tsx        # 用户认证状态管理
├── pages/                     # 页面组件
│   └── LoginPage.tsx          # 登录/注册页面
└── components/
    ├── ToolRenderer.tsx        # 工具调用卡片渲染（加载中 / 结果 / 展开收起）
    ├── tools/                  # 各工具结果的专属展示组件
    │   ├── SearchResult.tsx    # Tavily 搜索结果
    │   ├── WeatherResult.tsx   # 天气结果
    │   ├── TimeResult.tsx      # 时间结果
    │   └── CalcResult.tsx      # 计算结果
    └── ui/                     # shadcn/ui 基础组件
        ├── button.tsx
        ├── input.tsx
        ├── scroll-area.tsx
        └── ...
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件（可选，用于覆盖默认配置）：

```bash
VITE_API_URL=http://localhost:3001
```

### 3. 启动开发服务器

> **前提**：确保后端已在 `http://localhost:3001` 运行。

```bash
npm run dev
```

浏览器访问 **`http://localhost:3000`**。

### 4. 构建生产包

```bash
npm run build
```

## 核心功能

### 🎯 顺序流式渲染
通过遍历 `message.parts`（AI SDK 4.x 协议），文本段落与工具卡片严格按照 AI 生成的逻辑顺序交织展示，而非统一堆叠在消息底部。

### 🃏 工具卡片
- **加载中**：动态进度条 + 话术阶段轮换 + 实时计时
- **执行成功**：点击头部可展开/收起，工具完成后延迟 50ms 自动收起
- **防闪烁优化**：模块级缓存避免组件重挂载时重复触发动画

### ⚡ 性能优化
- 消息列表封装为 `React.memo` 组件，打字输入不触发消息区重渲染
- 工具卡片动画使用 Tailwind CSS `animate-in` 替代 Framer Motion，杜绝流式更新期间的闪烁

### 🎨 设计风格
- 极简深色主题（Zinc / Slate 调色板 + 翡翠绿点缀）
- 自定义极细滚动条
- Framer Motion 控制的消息入场动画

### 🔐 用户认证
- **登录/注册**：基于 Supabase 的邮箱密码认证
- **状态持久化**：登录状态和 Token 存储在 localStorage
- **自动刷新**：页面刷新后自动恢复登录状态
- **未登录支持**：未登录用户可以正常使用 AI 对话（不保存历史记录）

### 📝 会话管理
- **自动创建**：登录用户首次对话自动创建新会话
- **会话列表**：左侧边栏展示所有历史会话
- **会话切换**：点击会话可加载历史消息
- **标题生成**：会话标题基于首条用户消息自动生成（前 30 字符）
- **会话删除**：支持删除不需要的会话
- **状态持久化**：当前会话 ID 存储在 localStorage，刷新后保持

## 认证流程

### 登录流程

1. 用户在登录页面输入邮箱和密码
2. 调用后端 `/auth/login` 接口
3. 后端通过 Supabase 验证用户凭证
4. 返回 JWT Token 和用户信息
5. 前端将 Token 存储到 localStorage
6. 更新 AuthContext 的用户状态

### 注册流程

1. 用户在登录页面点击"注册"切换到注册模式
2. 输入邮箱和密码
3. 调用后端 `/auth/register` 接口
4. 后端通过 Supabase 创建新用户
5. 返回 JWT Token 和用户信息
6. 自动登录并跳转到聊天界面

### 登出流程

1. 用户点击用户信息区域的登出按钮
2. 清除 localStorage 中的 Token 和用户信息
3. 更新 AuthContext 的用户状态为 null
4. 清空当前会话和消息列表

## 会话管理流程

### 创建新会话

1. 用户点击"新对话"按钮
2. 清空当前消息列表
3. 清除当前会话 ID
4. 下次发送消息时，后端自动创建新会话

### 继续会话

1. 用户点击左侧会话列表中的某个会话
2. 调用后端 `/history/conversations/:id/messages` 接口
3. 加载该会话的所有历史消息
4. 更新当前会话 ID 和消息列表

### 删除会话

1. 用户鼠标悬停在会话上，显示删除按钮
2. 点击删除按钮
3. 调用后端 `/history/conversations/:id` 接口（DELETE）
4. 如果删除的是当前会话，清空消息列表
5. 重新加载会话列表

### 消息保存

1. 用户发送消息时，携带 `conversationId` 参数
2. 如果是首次对话且没有 `conversationId`，后端创建新会话
3. 后端将用户消息保存到数据库
4. AI 回复完成后，后端将 AI 消息保存到数据库
5. 前端刷新会话列表，更新会话标题和更新时间

## 扩展：添加新工具渲染

1. 在 `src/components/tools/` 下创建新组件，接受 `{ result, args }` props
2. 在 `src/components/ToolRenderer.tsx` 的 `TOOL_COMPONENTS` 映射表中注册：

```ts
const TOOL_COMPONENTS = {
  // 新增
  my_new_tool: MyNewToolResult,
};
```

## 环境说明

后端 API 地址配置：

### 方式一：环境变量（推荐）
创建 `.env` 文件：
```bash
VITE_API_URL=http://localhost:3001
```

### 方式二：硬编码
在 `src/lib/supabase.ts` 中修改：
```ts
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

## API 调用示例

### 认证接口

```typescript
// 登录
const response = await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

// 注册
const response = await fetch(`${API_URL}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

### 历史记录接口

```typescript
// 获取会话列表
const response = await fetch(`${API_URL}/history/conversations`, {
  headers: { Authorization: `Bearer ${token}` }
});

// 获取会话消息
const response = await fetch(`${API_URL}/history/conversations/${conversationId}/messages`, {
  headers: { Authorization: `Bearer ${token}` }
});

// 删除会话
const response = await fetch(`${API_URL}/history/conversations/${conversationId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` }
});
```

### 对话接口

```typescript
const { messages, input, handleInputChange, handleSubmit } = useChat({
  api: `${API_URL}/chat`,
  headers: token ? { Authorization: `Bearer ${token}` } : {},
  body: { conversationId: currentConversationId },
  onFinish: (message) => {
    // AI 回复完成后的回调
    if (message.role === 'assistant') {
      loadConversations();
    }
  },
});
```

## 组件说明

### AuthContext
全局认证状态管理，提供：
- `user` - 当前用户信息
- `token` - JWT Token
- `loading` - 加载状态
- `login(email, password)` - 登录方法
- `register(email, password)` - 注册方法
- `logout()` - 登出方法

### LoginPage
登录/注册页面，包含：
- 邮箱和密码输入框
- 登录/注册模式切换
- 表单验证
- 错误提示

### App
主应用组件，包含：
- 左侧边栏（会话列表）
- 主聊天区域
- 用户信息展示
- 登录/登出按钮
