import { tool } from 'ai';
import { z } from 'zod';

export const calculatorTool = tool({
  description: '执行精准的数学计算（加减乘除）',
  parameters: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('计算类型'),
    a: z.number().describe('第一个操作数'),
    b: z.number().describe('第二个操作数'),
  }),
  execute: async ({ operation, a, b }) => {
    console.log(`[工具中心] 正在执行计算器操作: ${a} ${operation} ${b}`);
    let result: number;
    switch (operation) {
      case 'add': result = a + b; break;
      case 'subtract': result = a - b; break;
      case 'multiply': result = a * b; break;
      case 'divide':
        if (b === 0) return { error: '除数不能为零' };
        result = a / b;
        break;
      default: return { error: '未定义的计算类型' };
    }
    return { result };
  },
});
