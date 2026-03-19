import { Injectable } from '@nestjs/common';
import { weatherTool } from '../tools/weather.tool';
import { timeTool } from '../tools/time.tool';
import { calculatorTool } from '../tools/calculator.tool';
import { createRenderChartTool } from "../tools/render-chart.tool";
import { createRenderAlgorithmSceneTool } from "../tools/render-algorithm-scene.tool";
import type { ChartEventWriter } from "./chart-stream";
import type { AlgorithmSceneEventWriter } from "./algorithm-scene-stream";

@Injectable()
export class ToolRegistryService {
  constructor() {}

  getAllTools(
    userId?: string,
    token?: string,
    onChartEvent?: ChartEventWriter,
    onSceneEvent?: AlgorithmSceneEventWriter,
  ) {
    const tools: Record<string, any> = {
      getWeather: weatherTool,
      getCurrentTime: timeTool,
      calculate: calculatorTool,
      render_chart: createRenderChartTool(onChartEvent),
      render_algorithm_scene: createRenderAlgorithmSceneTool(onSceneEvent),
    };

    return tools;
  }
}
