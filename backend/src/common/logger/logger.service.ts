import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

@Injectable()
export class Logger implements NestLoggerService {
  private context: string;
  private logLevel: LogLevel;

  constructor(context: string = 'App') {
    this.context = context;
    this.logLevel = LogLevel.INFO;
  }

  setContext(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] [${this.context}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  log(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log(this.formatMessage('INFO', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  error(message: string, trace?: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, context), trace);
    }
  }

  verbose(message: string, context?: LogContext): void {
    this.debug(message, context);
  }

  logRequest(method: string, url: string, statusCode: number, responseTime: number, userId?: string): void {
    this.log(`HTTP ${method} ${url} ${statusCode} - ${responseTime}ms`, {
      method,
      url,
      statusCode,
      responseTime,
      userId,
    });
  }

  logUserAction(action: string, userId: string, details?: any): void {
    this.log(`User action: ${action}`, { userId, action, ...details });
  }

  logSystemEvent(event: string, details?: any): void {
    this.log(`System event: ${event}`, { event, ...details });
  }

  logError(error: Error, context?: LogContext): void {
    this.error(error.message, error.stack, context);
  }
}
