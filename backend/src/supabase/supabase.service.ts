import { Injectable } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL!;
    const anonKey = process.env.SUPABASE_ANON_KEY!;

    this.client = createClient(url, anonKey);
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  async getClientWithToken(token: string): Promise<SupabaseClient> {
    // 先验证 token 并获取用户信息
    const { data: { user }, error: userError } = await this.client.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid token');
    }
    
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
    
    // 设置 session 以便 RLS 策略的 auth.uid() 能工作
    await client.auth.setSession({
      access_token: token,
      refresh_token: token, // 使用 access_token 作为 refresh_token（因为我们不刷新）
    });
    
    return client;
  }

  async getUserFromToken(token: string) {
    const { data, error } = await this.client.auth.getUser(token);
    if (error) throw error;
    return data.user;
  }
}
