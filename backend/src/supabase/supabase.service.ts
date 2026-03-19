import { Injectable } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { decode, verify, type JwtPayload } from "jsonwebtoken";

export interface TokenUser {
  id: string;
  email: string | null;
}

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;
  private adminClient: SupabaseClient | null = null;

  constructor() {
    const url = process.env.SUPABASE_URL!;
    const anonKey = process.env.SUPABASE_ANON_KEY!;

    this.client = createClient(url, anonKey);
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  getAdminClient(): SupabaseClient {
    if (this.adminClient) {
      return this.adminClient;
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    }

    this.adminClient = createClient(process.env.SUPABASE_URL!, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    return this.adminClient;
  }

  async getClientWithToken(token: string): Promise<SupabaseClient> {
    const user = this.parseUserFromToken(token);
    if (!user) {
      throw new Error("Invalid token");
    }

    return createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );
  }

  async getUserFromToken(token: string) {
    return this.parseUserFromToken(token);
  }

  private parseUserFromToken(token: string): TokenUser | null {
    const payload = this.readTokenPayload(token);
    if (!payload?.sub) {
      return null;
    }

    if (typeof payload.exp === "number") {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp <= now) {
        return null;
      }
    }

    return {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
    };
  }

  private readTokenPayload(token: string): JwtPayload | null {
    const secret =
      process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;

    if (secret) {
      try {
        const verified = verify(token, secret);
        if (verified && typeof verified === "object") {
          return verified as JwtPayload;
        }
      } catch {
        // Fall back to decode-only mode so non-matching local secrets do not
        // force an extra network roundtrip to Supabase Auth on every request.
      }
    }

    const decoded = decode(token);
    if (!decoded || typeof decoded !== "object") {
      return null;
    }

    return decoded as JwtPayload;
  }
}
