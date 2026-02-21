import { tool } from 'ai';
import { z } from 'zod';

export const weatherTool = tool({
  description: '获取指定城市的实时天气',
  parameters: z.object({
    location: z.string().describe('城市名称，如北京、上海'),
  }),
  execute: async ({ location }) => {
    console.log(`[工具中心] 正在执行真实天气查询: ${location}`);
    try {
      const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`);
      
      if (!response.ok) {
        throw new Error('无法获取天气数据');
      }

      const data = await response.json();
      const current = data.current_condition[0];
      
      return {
        location: data.nearest_area[0].areaName[0].value,
        temperature: current.temp_C,
        condition: current.lang_zh ? current.lang_zh[0].value : current.weatherDesc[0].value,
        forecast: `体感温度 ${current.FeelsLikeC}°C，湿度 ${current.humidity}%`,
      };
    } catch (error) {
      console.error('天气工具执行失败:', error);
      return {
        location,
        temperature: '未知',
        condition: '查询失败',
        forecast: '请检查网络连接或城市名称是否正确',
      };
    }
  },
});
