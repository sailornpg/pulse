import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as dotenv from "dotenv";
import passport from "passport";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { AllExceptionsFilter } from "./common/filters/exception.filter";
import {
  AppLogger,
  registerProcessEventHandlers,
} from "./common/logger/logger.service";

function parseCorsOrigins() {
  return (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  dotenv.config();
  const appLogger = new AppLogger("Bootstrap");
  AppLogger.installConsoleBridge();
  const allowedOrigins = parseCorsOrigins();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(appLogger);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  });
  app.enableShutdownHooks();

  app.use(passport.initialize());

  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const bodyParser = require("body-parser");
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

  registerProcessEventHandlers(appLogger, async () => {
    await app.close();
  });

  const port = Number(process.env.PORT || 3001);
  await app.listen(port, "0.0.0.0");
  appLogger.logSystemEvent("backend_started", {
    port,
    corsOrigins: allowedOrigins,
    logDir: process.env.LOG_DIR || "logs",
  });
}

bootstrap().catch((error) => {
  const logger = new AppLogger("Bootstrap");
  logger.fatal(
    "Application bootstrap failed",
    error instanceof Error ? error.stack : undefined,
  );
  process.exit(1);
});
