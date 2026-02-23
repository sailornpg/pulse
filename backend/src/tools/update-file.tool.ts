import { tool } from 'ai';
import { z } from 'zod';
import { AgentService } from '../agent/agent.service';

export const createUpdateFileTool = (agentService: AgentService, userId?: string, token?: string) => {
  return tool({
    description: '更新 AI 自身的记忆文件。当你需要记住用户的偏好、改变自己的行为方式、或更新长期记忆时使用。',
    parameters: z.object({
      file_path: z.enum(['soul.md', 'rules.md', 'memory.md', 'user.md']).describe('要修改的文件路径'),
      content: z.string().describe('完整的新内容（非追加，是覆盖写入）'),
      reason: z.string().describe('修改原因（简单描述为什么修改）'),
    }),
    execute: async ({ file_path, content, reason }) => {
      console.log(`[Agent] AI 请求更新文件: ${file_path}, 原因: ${reason}`);
      
      if (userId && agentService) {
        try {
          await agentService.updateFile(userId, file_path, content, reason, token);
          return { success: true, message: `已更新 ${file_path}` };
        } catch (error) {
          console.error('[Agent] 更新文件失败:', error);
          return { success: false, message: '更新失败' };
        }
      }
      return { success: false, message: '用户未登录，无法保存' };
    },
  });
};
