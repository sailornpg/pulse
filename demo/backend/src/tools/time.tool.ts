import { tool } from 'ai';
import { z } from 'zod';

export const timeTool = tool({
  description: '获取当前的系统时间',
  parameters: z.object({}), // 不需要参数
  execute: async () => {
    const now = new Date();
    console.log(`[工具中心] 正在执行时间查询: ${now.toLocaleString()}`);
    return {
      iso: now.toISOString(),
      local: now.toLocaleString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  },
});
