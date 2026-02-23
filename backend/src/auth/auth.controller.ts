import {
  Controller,
  Post,
  Get,
  Body,
  UnauthorizedException,
  BadRequestException,
  UseGuards,
  Request,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { JwtAuthGuard } from "./jwt.guard";
import { AgentService } from "../agent/agent.service";

@Controller("auth")
export class AuthController {
  constructor(
    private supabase: SupabaseService,
    private agentService: AgentService,
  ) {}

  @Post("login")
  async login(@Body() body: any) {
    const { email, password } = body;
    const { data, error } = await this.supabase
      .getClient()
      .auth.signInWithPassword({
        email,
        password,
      });

    if (error) throw new UnauthorizedException(error.message);
    return data;
  }

  @Post("register")
  async register(@Body() body: any) {
    const { email, password } = body;
    const { data, error } = await this.supabase.getClient().auth.signUp({
      email,
      password,
    });

    if (error) throw new BadRequestException(error.message);
    
    // 初始化用户的AI记忆文件
    if (data.user) {
      try {
        const token = data.session?.access_token;
        await this.agentService.initializeUserFiles(data.user.id, token);
        console.log(`[Auth] 用户 ${data.user.id} 的AI文件初始化完成`);
      } catch (e) {
        console.error('[Auth] 初始化用户AI文件失败:', e);
        // 不影响注册流程，只记录错误
      }
    }
    
    return data;
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      await this.supabase.getClient().auth.signOut();
    }
    return { success: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req: any) {
    return {
      id: req.user.id,
      email: req.user.email,
    };
  }
}
