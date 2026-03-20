import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as dotenv from "dotenv";
import passport from "passport";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { AllExceptionsFilter } from "./common/filters/exception.filter";

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  app.use(passport.initialize());

  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const bodyParser = require("body-parser");
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

  await app.listen(process.env.PORT || 3001);
  console.log("Backend is running on: http://localhost:3001");
}
bootstrap();
