import { Module, forwardRef } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./jwt.strategy";
import { JwtAuthService } from "./jwt-auth.service";
import { SupabaseModule } from "../supabase/supabase.module";
import { AgentModule } from "../agent/agent.module";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "fallback-secret-for-dev",
      signOptions: { expiresIn: "7d" },
    }),
    SupabaseModule,
    forwardRef(() => AgentModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthService],
  exports: [AuthService, JwtAuthService],
})
export class AuthModule {}
