import { Injectable, UnauthorizedException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

@Injectable()
export class JwtAuthService {
  constructor(private supabase: SupabaseService) {}

  async validateToken(token: string): Promise<{ id: string; email: string } | null> {
    try {
      const user = await this.supabase.getUserFromToken(token);
      if (!user) return null;
      return {
        id: user.id,
        email: user.email || "",
      };
    } catch {
      return null;
    }
  }
}
