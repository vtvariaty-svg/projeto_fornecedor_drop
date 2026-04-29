import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");

  // Valida e transforma DTOs automaticamente
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true })
  );

  app.enableCors();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`API running on port ${port} — endpoints under /api`);
}

bootstrap();
