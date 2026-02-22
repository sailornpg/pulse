import { Injectable, UnauthorizedException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

@Injectable()
export class AuthService {
  constructor(private supabase: SupabaseService) {}

  async validateUser(token: string) {
    try {
      const user = await this.supabase.getUserFromToken(token);
      if (!user) throw new UnauthorizedException("User not found");
      return user;
    } catch (e) {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
