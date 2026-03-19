import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgentService } from './agent.service';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private agentService: AgentService,
    private supabase: SupabaseService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyDiary() {
    this.logger.log('[Agent] 开始每日日记生成...');
    
    try {
      const users = await this.getActiveUsers();
      
      for (const userId of users) {
        try {
          await this.writeDiary(userId);
        } catch (e) {
          this.logger.error(`[Agent] 用户 ${userId} 日记写入失败`, e);
        }
      }
    } catch (error) {
      this.logger.error('[Agent] 每日日记任务失败', error);
    }
  }

  private async getActiveUsers(): Promise<string[]> {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('conversations')
      .select('user_id')
      .order('updated_at', { ascending: false })
      .limit(500);

    return [...new Set((data || []).map((row: any) => row.user_id).filter(Boolean))].slice(0, 100);
  }

  private async writeDiary(userId: string) {
    const client = this.supabase.getClient();
    const today = new Date().toISOString().split('T')[0];
    const filePath = `diary/${today}.md`;
    const startOfDay = `${today}T00:00:00+00:00`;

    const existingFile = await this.agentService.getFile(userId, filePath);
    if (existingFile) {
      this.logger.log(`[Agent] 用户 ${userId} 今日日记已存在，跳过`);
      return;
    }

    const { data: conversations } = await client
      .from('conversations')
      .select('messages(content, role, created_at)')
      .eq('user_id', userId)
      .gte('updated_at', startOfDay)
      .order('updated_at', { ascending: false })
      .limit(20);

    const messages = (conversations || [])
      .flatMap((conversation: any) => conversation.messages || [])
      .filter((message: any) => message.created_at >= startOfDay)
      .sort((left: any, right: any) => left.created_at.localeCompare(right.created_at))
      .slice(0, 50);

    if (!messages || messages.length === 0) {
      this.logger.log(`[Agent] 用户 ${userId} 今日无对话，跳过`);
      return;
    }

    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = `
请根据以下今日对话记录，写一篇今日日记。
格式：
# ${today} 日记

## 今日概要
[一句话概括今天发生了什么]

## 重要对话
- [关键对话1]
- [关键对话2]

## 用户偏好观察
- [从对话中发现的偏好或习惯]

## 明日待办
- [从对话中推断出的待办事项]

对话记录：
${conversationText}
`.trim();

    try {
      const { generateText } = await import('ai');
      const { createDeepSeek } = await import('@ai-sdk/deepseek');
      
      const deepseekProvider = createDeepSeek();
      const result = await generateText({
        model: deepseekProvider("deepseek-reasoner"),
        messages: [{ role: 'user', content: prompt }],
      });

      const diaryContent = result.text;
      await this.agentService.updateFile(userId, filePath, diaryContent, '每日日记自动生成');
      
      this.logger.log(`[Agent] 用户 ${userId} 今日日记已生成: ${filePath}`);
    } catch (error) {
      this.logger.error(`[Agent] 用户 ${userId} 日记生成失败`, error);
    }
  }
}
