# Pulse AI — 前端应用

基于 **React + Vite** 构建的现代化 AI 对话界面，采用极简深色设计风格，集成 shadcn/ui 组件库和 Framer Motion 动画，支持工具调用的顺序流式渲染。

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
| 语言 | TypeScript 5 |

## 项目结构

```
frontend/src/
├── App.tsx                     # 主应用：布局、useChat、输入框
├── index.css                   # 全局样式：Tailwind 配置、滚动条、Markdown
├── main.tsx                    # React 挂载入口
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

### 2. 启动开发服务器

> **前提**：确保后端已在 `http://localhost:3001` 运行。

```bash
npm run dev
```

浏览器访问 **`http://localhost:3000`**。

### 3. 构建生产包

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

后端 API 地址硬编码在 `App.tsx` 的 `useChat` 配置中：

```ts
const { ... } = useChat({
  api: 'http://localhost:3001/chat',
});
```

如需修改，直接更新该地址即可。
