import { Controller, Get, Put, Body, Param, Request, Headers, UseGuards } from '@nestjs/common';
import { AgentService, AgentFile } from './agent.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  private extractToken(req: any, headers: any): string | undefined {
    const authHeader = headers.authorization || req.headers.authorization;
    return authHeader?.replace('Bearer ', '');
  }

  @Get('files')
  async getAllFiles(@Request() req: any, @Headers() headers: any): Promise<AgentFile[]> {
    const token = this.extractToken(req, headers);
    // await this.agentService.initializeUserFiles(req.user.id, token);
    return this.agentService.getAllFiles(req.user.id, token);
  }

  @Get('files/:path')
  async getFile(@Param('path') path: string, @Request() req: any, @Headers() headers: any): Promise<AgentFile | null> {
    const token = this.extractToken(req, headers);
    return this.agentService.getFile(req.user.id, path, token);
  }

  @Put('files/:path')
  async updateFile(
    @Param('path') path: string,
    @Body() body: { content: string; reason?: string },
    @Request() req: any,
    @Headers() headers: any
  ): Promise<AgentFile> {
    const token = this.extractToken(req, headers);
    return this.agentService.updateFile(req.user.id, path, body.content, body.reason, token);
  }

  @Get('context')
  async getContext(@Request() req: any, @Headers() headers: any): Promise<{ systemPrompt: string }> {
    const token = this.extractToken(req, headers);
    const systemPrompt = await this.agentService.assembleContext(req.user.id, token);
    return { systemPrompt };
  }

  @Get('diaries')
  async getDiaries(@Request() req: any, @Headers() headers: any): Promise<AgentFile[]> {
    const token = this.extractToken(req, headers);
    return this.agentService.getDiaryFiles(req.user.id, token);
  }
}
