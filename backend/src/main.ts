import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as dotenv from "dotenv";

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // 开启跨域，方便前端调用

  // 增加请求体大小限制，防止带有大量历史记录的 PayloadTooLargeError
  const bodyParser = require("body-parser");
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

  await app.listen(3001);
  console.log("Backend is running on: http://localhost:3001");
}
bootstrap();
