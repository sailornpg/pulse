import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtAuthService } from "./jwt-auth.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtAuthService: JwtAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("No token provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const user = await this.jwtAuthService.validateToken(token);

    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    request.user = user;
    return true;
  }
}
