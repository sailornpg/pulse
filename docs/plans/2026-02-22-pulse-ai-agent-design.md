# Pulse AI 数字生命系统 - 技术方案

**日期**: 2026-02-22
**状态**: 已批准

---

## 一、系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端 React                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  对话区     │  │  通知系统   │  │  设置面板 (透明模式开关) │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP / WebSocket
┌────────────────────────────▼────────────────────────────────────┐
│                        后端 NestJS                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ ChatController │  │ AgentController │  │ ScheduleService │ │
│  │  (对话处理)     │  │  (文件管理)     │  │  (定时任务)     │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                     │                     │          │
│  ┌────────▼─────────────────────▼─────────────────────▼────────┐│
│  │              ContextAssembler (上下文组装器)                  ││
│  │   - 提取 SOUL.md, USER.md, MEMORY.md                       ││
│  │   - 注入 System Prompt                                      ││
│  └──────────────────────────────────────────────────────────────┘│
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      Supabase                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │ agent_files     │  │ conversations   │  │ messages       │ │
│  │ (AI 灵魂文件)   │  │ (对话)          │  │ (消息历史)     │ │
│  └─────────────────┘  └─────────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、核心数据表设计

### agent_files 表（AI 灵魂文件）

```sql
CREATE TABLE agent_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  file_path VARCHAR(255),
  content TEXT,
  file_type VARCHAR(50),        -- 'soul', 'rules', 'memory', 'diary'
  is_system BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_files_user_path ON agent_files(user_id, file_path);
```

### 初始文件结构

```
agent_files/
├── soul.md          # 核心人格（系统文件）
├── rules.md         # 行为规则
├── user.md          # 用户画像
├── memory.md        # 长期记忆
└── diary/           # 日记目录
    └── YYYY-MM-DD.md
```

---

## 三、触发优先级实现

| 优先级 | 触发方式 | 实现机制 |
|--------|----------|----------|
| **P0 (A)** | 显式触发 | AI 检测到用户明确要求改变时，调用 `update_file` 工具 |
| **P1 (B)** | 隐式学习 | 对话结束后静默分析，提取偏好写入 `memory.md` |
| **P2 (C)** | 定时任务 | 每天凌晨触发，写入 `diary/YYYY-MM-DD.md` |

---

## 四、关键模块设计

### 1. ContextAssembler（上下文组装器）

每次对话前调用，组装系统提示词：

```typescript
async function assembleContext(userId: string) {
  const files = await getAgentFiles(userId);
  
  const soul = files.find(f => f.file_path === 'soul.md')?.content || '';
  const rules = files.find(f => f.file_path === 'rules.md')?.content || '';
  const memory = files.find(f => f.file_path === 'memory.md')?.content || '';
  
  return {
    systemPrompt: `${soul}\n\n## 规则\n${rules}\n\n## 记忆\n${memory}`
  };
}
```

### 2. AI 工具注册（方案 A 核心）

向 AI 暴露的工具：

```typescript
const agentTools = [
  {
    name: 'update_file',
    description: '更新 AI 自身文件（soul.md, rules.md, memory.md 等）',
    params: {
      file_path: '要修改的文件路径',
      content: '新内容（完整写入，非追加）',
      reason: '修改原因（用于通知用户）'
    }
  }
];
```

### 3. 通知系统（方案 C）

```typescript
interface AgentEvent {
  type: 'SOUL_UPDATED' | 'RULES_UPDATED' | 'NEW_DIARY';
  file_path: string;
  reason: string;
  timestamp: Date;
}
```

---

## 五、前端展示

### 通知样式

```
┌────────────────────────────────────┐
│ ⚡ AI 更新了它的行为规则           │
│ "以后跟你说话更随意一些"           │
│ [查看详情] [忽略]                 │
└────────────────────────────────────┘
```

### 设置面板

- 开启"透明模式"：显示 AI 的大脑文件树
- 接收进化通知：AI 自我更新时推送通知

---

## 六、实施分阶段

| 阶段 | 功能 | 预估工作日 |
|------|------|-----------|
| **Phase 1** | 数据库设计 + 基础文件读写 API | 1-2天 |
| **Phase 2** | ContextAssembler + System Prompt 注入 | 1天 |
| **Phase 3** | 方案 A：显式触发（update_file 工具） | 1天 |
| **Phase 4** | 方案 B：隐式学习（对话后摘要） | 1天 |
| **Phase 5** | 方案 C：定时任务 + 日记 | 1天 |
| **Phase 6** | 前端通知 + 透明模式 | 1天 |

---

## 七、参考文件

- SOUL.md: `backend/src/base/soul.md`
- AGENTS.md: `backend/src/base/agents.md`
