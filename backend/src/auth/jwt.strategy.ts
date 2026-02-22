import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || "fallback-secret-for-dev",
    });
  }

  async validate(payload: any) {
    console.log("[JWT] Payload received:", payload);
    
    if (!payload || !payload.sub) {
      console.log("[JWT] Invalid payload - missing sub");
      throw new UnauthorizedException("Invalid token");
    }
    
    const user = {
      id: payload.sub,
      email: payload.email || "",
    };
    
    console.log("[JWT] User validated:", user);
    return user;
  }
}
