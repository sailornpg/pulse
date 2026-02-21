import { Injectable } from '@nestjs/common';
import { weatherTool } from '../tools/weather.tool';
import { timeTool } from '../tools/time.tool';
import { calculatorTool } from '../tools/calculator.tool';

@Injectable()
export class ToolRegistryService {
  // 所有的工具都注册在这里
  private readonly tools = {
    getWeather: weatherTool,
    getCurrentTime: timeTool,
    calculate: calculatorTool,
  };

  /**
   * 获取模型需要的所有工具定义
   */
  getAllTools() {
    return this.tools;
  }
}
