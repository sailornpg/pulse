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

@Controller("auth")
export class AuthController {
  constructor(private supabase: SupabaseService) {}

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
