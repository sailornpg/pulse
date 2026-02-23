# Pulse AI 数字生命系统 - 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Pulse AI 添加自我进化、长期记忆、富有生命力的 Agent 能力

**Architecture:** 使用 Supabase 数据库模拟 VFS（虚拟文件系统），存储 AI 的灵魂文件(soul.md, rules.md, memory.md)，通过 ContextAssembler 注入 System Prompt，实现三层触发机制（显式>隐式>定时）

**Tech Stack:** NestJS, React, Supabase, Schedule (Cron)

---

## Phase 1: 数据库设计与基础 API

### Task 1: 创建 agent_files 数据表

**Step 1: 生成 SQL 脚本**

创建 `docs/sql/agent_files.sql`:
```sql
-- 创建 agent_files 表
CREATE TABLE IF NOT EXISTS agent_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path VARCHAR(255) NOT NULL,
  content TEXT DEFAULT '',
  file_type VARCHAR(50) DEFAULT 'general',
  is_system BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_agent_files_user_path ON agent_files(user_id, file_path);

-- 启用 RLS
ALTER TABLE agent_files ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can manage own agent files" ON agent_files
  FOR ALL USING (auth.uid() = user_id);
```

**Step 2: 用户确认执行**

用户需要在 Supabase SQL Editor 中执行此 SQL

---

### Task 2: 创建 Agent 模块（后端）

**Files:**
- Create: `backend/src/agent/agent.module.ts`
- Create: `backend/src/agent/agent.service.ts`
- Create: `backend/src/agent/agent.controller.ts`
- Create: `backend/src/agent/agent-files.service.ts`

**Step 1: 创建 agent.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
```

**Step 2: 创建 agent.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface AgentFile {
  id: string;
  user_id: string;
  file_path: string;
  content: string;
  file_type: string;
  is_system: boolean;
  updated_at: string;
}

@Injectable()
export class AgentService {
  constructor(private supabase: SupabaseService) {}

  async getFile(userId: string, filePath: string): Promise<AgentFile | null> {
    const { data } = await this.supabase.getClient()
      .from('agent_files')
      .select('*')
      .eq('user_id', userId)
      .eq('file_path', filePath)
      .single();
    return data;
  }

  async getAllFiles(userId: string): Promise<AgentFile[]> {
    const { data } = await this.supabase.getClient()
      .from('agent_files')
      .select('*')
      .eq('user_id', userId)
      .order('file_path');
    return data || [];
  }

  async updateFile(userId: string, filePath: string, content: string, reason?: string): Promise<AgentFile> {
    const client = this.supabase.getClient();
    
    const existing = await this.getFile(userId, filePath);
    
    if (existing) {
      const { data } = await client
        .from('agent_files')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      return data;
    } else {
      const { data } = await client
        .from('agent_files')
        .insert({ user_id: userId, file_path: filePath, content })
        .select()
        .single();
      return data;
    }
  }

  async assembleContext(userId: string): Promise<string> {
    const files = await this.getAllFiles(userId);
    
    const soul = files.find(f => f.file_path === 'soul.md')?.content || '';
    const rules = files.find(f => f.file_path === 'rules.md')?.content || '';
    const memory = files.find(f => f.file_path === 'memory.md')?.content || '';
    
    return `${soul}\n\n## 规则\n${rules}\n\n## 记忆\n${memory}`.trim();
  }
}
```

**Step 3: 创建 agent.controller.ts**

```typescript
import { Controller, Get, Post, Put, Body, Param, Request } from '@nestjs/common';
import { AgentService, AgentFile } from './agent.service';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('files')
  async getAllFiles(@Request() req: any): Promise<AgentFile[]> {
    return this.agentService.getAllFiles(req.user.id);
  }

  @Get('files/:path')
  async getFile(@Param('path') path: string, @Request() req: any): Promise<AgentFile | null> {
    return this.agentService.getFile(req.user.id, path);
  }

  @Put('files/:path')
  async updateFile(
    @Param('path') path: string,
    @Body() body: { content: string; reason?: string },
    @Request() req: any
  ): Promise<AgentFile> {
    return this.agentService.updateFile(req.user.id, path, body.content, body.reason);
  }

  @Get('context')
  async getContext(@Request() req: any): Promise<{ systemPrompt: string }> {
    const systemPrompt = await this.agentService.assembleContext(req.user.id);
    return { systemPrompt };
  }
}
```

**Step 4: 更新 app.module.ts**

在 imports 中添加 AgentModule

---

## Phase 2: ContextAssembler 集成

### Task 3: 修改 ChatService 集成 ContextAssembler

**Files:**
- Modify: `backend/src/chat/chat.service.ts`

**Step 1: 修改 chat.service.ts 注入 AgentService**

```typescript
import { AgentService } from '../agent/agent.service';

constructor(
  private readonly chatService: ChatService,
  private readonly historyService: HistoryService,
  private readonly agentService: AgentService,
) {}
```

**Step 2: 修改 createChatStream 方法**

```typescript
async createChatStream(messages: any[], userId?: string) {
  let systemPrompt = '';
  
  if (userId) {
    systemPrompt = await this.agentService.assembleContext(userId);
  }
  
  // 将 systemPrompt 注入到消息中
  const enhancedMessages = systemPrompt 
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;
    
  return this.llm.chat(enhancedMessages);
}
```

---

## Phase 3: 显式触发（方案 A）

### Task 4: 注册 update_file 工具

**Files:**
- Modify: `backend/src/chat/tool-registry.service.ts`

**Step 1: 添加 update_file 工具**

```typescript
{
  name: 'update_file',
  description: '更新 AI 自身文件。当需要记住用户偏好、改变行为方式或更新记忆时使用。',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        enum: ['soul.md', 'rules.md', 'memory.md'],
        description: '要修改的文件路径'
      },
      content: {
        type: 'string',
        description: '完整的新内容（非追加）'
      },
      reason: {
        type: 'string',
        description: '修改原因'
      }
    },
    required: ['file_path', 'content']
  }
}
```

**Step 2: 实现工具处理逻辑**

在 ChatService 中添加工具调用处理：
```typescript
async handleToolCall(toolCall: any, userId: string) {
  if (toolCall.name === 'update_file') {
    const { file_path, content, reason } = toolCall.parameters;
    await this.agentService.updateFile(userId, file_path, content, reason);
    return { success: true, reason };
  }
}
```

---

## Phase 4: 隐式学习（方案 B）

### Task 5: 对话后自动摘要

**Files:**
- Modify: `backend/src/chat/chat.controller.ts`

**Step 1: 在对话结束时触发摘要**

在 `res.on('finish')` 回调中添加：
```typescript
// 对话结束后静默学习
if (userId && convId) {
  setTimeout(async () => {
    try {
      const summary = await this.chatService.summarizeConversation(messages);
      if (summary) {
        const memory = await this.agentService.getFile(userId, 'memory.md');
        const newContent = memory 
          ? `${memory.content}\n- ${summary}`
          : `- ${summary}`;
        await this.agentService.updateFile(userId, 'memory.md', newContent);
      }
    } catch (e) {
      console.error('[Agent] 静默学习失败:', e);
    }
  }, 1000);
}
```

**Step 2: 实现 summarizeConversation 方法**

```typescript
async summarizeConversation(messages: any[]): Promise<string | null> {
  // 调用 LLM 提取关键信息
  const prompt = `
    分析以下对话，提取需要记住的用户偏好或重要信息。
    只返回一句话概括，如："用户喜欢用中文交流"
    如果没有重要信息，返回 "NONE"
    
    对话：
    ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
  `;
  
  const result = await this.llm.chat([{ role: 'user', content: prompt }]);
  return result.content === 'NONE' ? null : result.content;
}
```

---

## Phase 5: 定时任务（方案 C）

### Task 6: 每日日记系统

**Files:**
- Create: `backend/src/agent/scheduler.service.ts`

**Step 1: 创建 scheduler.service.ts**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgentService } from './agent.service';
import { HistoryService } from '../history/history.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private agentService: AgentService,
    private historyService: HistoryService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyDiary() {
    this.logger.log('[Agent] 开始每日日记...');
    
    // 获取所有活跃用户
    const users = await this.getActiveUsers();
    
    for (const userId of users) {
      try {
        await this.writeDiary(userId);
      } catch (e) {
        this.logger.error(`[Agent] 用户 ${userId} 日记写入失败`, e);
      }
    }
  }

  private async writeDiary(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const messages = await this.historyService.getRecentMessages(userId, 50);
    
    if (messages.length === 0) return;

    const prompt = `
      以第一人称写一篇今天的日记，总结与用户的主要对话内容。
      格式：Markdown
      长度：100-200字
    `;
    
    const diary = await this.llm.chat([{ role: 'user', content: prompt }]);
    await this.agentService.updateFile(userId, `diary/${today}.md`, diary.content);
  }

  private async getActiveUsers(): Promise<string[]> {
    // 查询最近7天有对话的用户
    // 实现略
    return [];
  }
}
```

---

## Phase 6: 前端通知与透明模式

### Task 7: 前端通知组件

**Files:**
- Create: `frontend/src/components/AgentNotification.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: 创建 AgentNotification.tsx**

```typescript
export function AgentNotification({ 
  event, 
  onDismiss, 
  onViewDetails 
}: {
  event: AgentEvent;
  onDismiss: () => void;
  onViewDetails: () => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 shadow-xl max-w-sm">
        <div className="flex items-start gap-3">
          <span className="text-xl">⚡</span>
          <div className="flex-1">
            <h4 className="font-medium text-zinc-100">AI 更新了它的{getFileTypeName(event.file_path)}</h4>
            <p className="text-sm text-zinc-400 mt-1">"{event.reason}"</p>
            <div className="flex gap-2 mt-3">
              <button onClick={onViewDetails} className="text-xs text-emerald-400 hover:underline">
                查看详情
              </button>
              <button onClick={onDismiss} className="text-xs text-zinc-500 hover:underline">
                忽略
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 8: 透明模式设置

**Files:**
- Create: `frontend/src/components/AgentSettings.tsx`
- Modify: `frontend/src/App.tsx`

---

## 实施顺序

1. **Task 1**: 创建数据库表（用户手动执行 SQL）
2. **Task 2**: 创建 Agent 模块
3. **Task 3**: 集成 ContextAssembler
4. **Task 4**: 注册 update_file 工具
5. **Task 5**: 隐式学习
6. **Task 6**: 定时日记
7. **Task 7-8**: 前端通知

---

## Plan complete saved to `docs/plans/2026-02-22-pulse-ai-agent-design.md`

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
