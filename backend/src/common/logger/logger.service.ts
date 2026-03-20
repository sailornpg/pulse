import { Injectable, LoggerService as NestLoggerService } from "@nestjs/common";
import { existsSync, mkdirSync, WriteStream, createWriteStream } from "fs";
import { join, resolve } from "path";
import { format } from "util";

export enum LogLevel {
  DEBUG = 10,
  INFO = 20,
  WARN = 30,
  ERROR = 40,
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

type LogMethod = "log" | "warn" | "error" | "debug";

@Injectable()
export class AppLogger implements NestLoggerService {
  private static initialized = false;
  private static consoleBridgeInstalled = false;
  private static appStream: WriteStream | null = null;
  private static errorStream: WriteStream | null = null;

  private context: string;
  private readonly logLevel: LogLevel;

  constructor(context = "App") {
    this.context = context;
    this.logLevel = AppLogger.resolveLogLevel(process.env.LOG_LEVEL);
    AppLogger.initializeStreams();
  }

  setContext(context: string) {
    this.context = context;
  }

  static installConsoleBridge() {
    if (AppLogger.consoleBridgeInstalled) {
      return;
    }

    AppLogger.consoleBridgeInstalled = true;

    console.log = (...args: unknown[]) => {
      AppLogger.write("INFO", "Console", format(...args));
    };
    console.info = (...args: unknown[]) => {
      AppLogger.write("INFO", "Console", format(...args));
    };
    console.warn = (...args: unknown[]) => {
      AppLogger.write("WARN", "Console", format(...args));
    };
    console.error = (...args: unknown[]) => {
      AppLogger.write("ERROR", "Console", format(...args));
    };
    console.debug = (...args: unknown[]) => {
      AppLogger.write("DEBUG", "Console", format(...args));
    };
  }

  log(message: unknown, context?: string | LogContext): void {
    if (this.logLevel > LogLevel.INFO) {
      return;
    }
    AppLogger.write("INFO", this.resolveContext(context), this.stringify(message), this.resolveMeta(context));
  }

  warn(message: unknown, context?: string | LogContext): void {
    if (this.logLevel > LogLevel.WARN) {
      return;
    }
    AppLogger.write("WARN", this.resolveContext(context), this.stringify(message), this.resolveMeta(context));
  }

  error(message: unknown, trace?: string, context?: string | LogContext): void {
    if (this.logLevel > LogLevel.ERROR) {
      return;
    }
    const meta = this.resolveMeta(context);
    if (trace) {
      meta.trace = trace;
    }
    AppLogger.write("ERROR", this.resolveContext(context), this.stringify(message), meta);
  }

  debug(message: unknown, context?: string | LogContext): void {
    if (this.logLevel > LogLevel.DEBUG) {
      return;
    }
    AppLogger.write("DEBUG", this.resolveContext(context), this.stringify(message), this.resolveMeta(context));
  }

  verbose(message: unknown, context?: string | LogContext): void {
    this.debug(message, context);
  }

  fatal(message: unknown, trace?: string, context?: string | LogContext) {
    const meta = this.resolveMeta(context);
    if (trace) {
      meta.trace = trace;
    }
    AppLogger.write("ERROR", this.resolveContext(context), `[FATAL] ${this.stringify(message)}`, meta);
  }

  logRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    context: LogContext = {},
  ) {
    this.log(`HTTP ${method} ${url} ${statusCode} - ${responseTime}ms`, {
      method,
      url,
      statusCode,
      responseTime,
      ...context,
    });
  }

  logSystemEvent(event: string, details?: LogContext) {
    this.log(`System event: ${event}`, { event, ...details });
  }

  logError(error: Error, context?: LogContext) {
    this.error(error.message, error.stack, context);
  }

  private resolveContext(context?: string | LogContext) {
    return typeof context === "string" && context ? context : this.context;
  }

  private resolveMeta(context?: string | LogContext): LogContext {
    if (!context || typeof context === "string") {
      return {};
    }
    return context;
  }

  private stringify(message: unknown): string {
    if (message instanceof Error) {
      return message.message;
    }
    if (typeof message === "string") {
      return message;
    }
    return format(message);
  }

  private static initializeStreams() {
    if (AppLogger.initialized) {
      return;
    }

    const logDir = AppLogger.getLogDir();
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    AppLogger.appStream = createWriteStream(join(logDir, "app.log"), {
      flags: "a",
      encoding: "utf8",
    });
    AppLogger.errorStream = createWriteStream(join(logDir, "error.log"), {
      flags: "a",
      encoding: "utf8",
    });
    AppLogger.initialized = true;
  }

  private static getLogDir() {
    const configuredDir = process.env.LOG_DIR || "logs";
    return resolve(process.cwd(), configuredDir);
  }

  private static resolveLogLevel(value?: string): LogLevel {
    switch ((value || "info").toLowerCase()) {
      case "debug":
      case "verbose":
        return LogLevel.DEBUG;
      case "warn":
        return LogLevel.WARN;
      case "error":
        return LogLevel.ERROR;
      case "info":
      default:
        return LogLevel.INFO;
    }
  }

  private static write(
    level: "DEBUG" | "INFO" | "WARN" | "ERROR",
    context: string,
    message: string,
    meta: LogContext = {},
  ) {
    AppLogger.initializeStreams();

    const timestamp = new Date().toISOString();
    const payload = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    const line = `[${timestamp}] [${level}] [${context}] ${message}${payload}`;

    const output = `${line}\n`;
    if (level === "ERROR") {
      process.stderr.write(output);
      AppLogger.errorStream?.write(output);
    } else {
      process.stdout.write(output);
    }

    AppLogger.appStream?.write(output);
  }
}

export function registerProcessEventHandlers(
  logger: AppLogger,
  closeApp?: () => Promise<void>,
) {
  let shuttingDown = false;

  const shutdown = async (signal: string, exitCode = 0) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.warn(`Received ${signal}, starting graceful shutdown`);

    try {
      if (closeApp) {
        await closeApp();
      }
      logger.log(`Shutdown completed for ${signal}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.fatal(`Shutdown failed for ${signal}`, err.stack, { signal });
    } finally {
      process.exit(exitCode);
    }
  };

  process.on("unhandledRejection", (reason) => {
    const error = reason instanceof Error ? reason : new Error(format(reason));
    logger.error("Unhandled promise rejection", error.stack, {
      reason: error.message,
    });
  });

  process.on("uncaughtException", (error) => {
    logger.fatal("Uncaught exception", error.stack, {
      error: error.message,
    });
    void shutdown("uncaughtException", 1);
  });

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}
