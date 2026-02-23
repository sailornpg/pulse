import { Injectable, Optional } from '@nestjs/common';
import { weatherTool } from '../tools/weather.tool';
import { timeTool } from '../tools/time.tool';
import { calculatorTool } from '../tools/calculator.tool';
import { createUpdateFileTool } from '../tools/update-file.tool';
import { AgentService } from '../agent/agent.service';

@Injectable()
export class ToolRegistryService {
  constructor(@Optional() private agentService?: AgentService) {}

  getAllTools(userId?: string, token?: string) {
    const updateAgentFile = this.agentService ? createUpdateFileTool(this.agentService, userId, token) : null;
    
    const tools: Record<string, any> = {
      getWeather: weatherTool,
      getCurrentTime: timeTool,
      calculate: calculatorTool,
    };
    
    if (updateAgentFile) {
      tools.updateAgentFile = updateAgentFile;
    }
    
    return tools;
  }
}
