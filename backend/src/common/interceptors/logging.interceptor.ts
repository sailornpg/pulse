import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { Observable } from "rxjs";
import { Request, Response } from "express";
import { AppLogger } from "../logger/logger.service";

type RequestWithId = Request & {
  requestId?: string;
};

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new AppLogger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<RequestWithId>();
    const response = ctx.getResponse<Response>();
    const { method, url, ip, headers } = request;
    const userAgent = headers["user-agent"] || "";
    const startTime = Date.now();
    const requestId =
      typeof headers["x-request-id"] === "string"
        ? headers["x-request-id"]
        : randomUUID();

    request.requestId = requestId;
    response.setHeader("X-Request-Id", requestId);

    response.on("finish", () => {
      const responseTime = Date.now() - startTime;
      const contentLength = response.get("content-length");

      this.logger.logRequest(method, url, response.statusCode, responseTime, {
        requestId,
        ip,
        userAgent,
        contentLength: contentLength || "0",
      });
    });

    response.on("close", () => {
      if (!response.writableEnded) {
        this.logger.warn(`HTTP ${method} ${url} closed before response completed`, {
          requestId,
          ip,
          userAgent,
        });
      }
    });

    return next.handle();
  }
}
