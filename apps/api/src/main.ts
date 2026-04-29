import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Todos os endpoints da API ficam sob /api/*
  // Exemplo: GET /api/health, POST /api/users, etc.
  app.setGlobalPrefix("api");

  app.enableCors();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`API running on port ${port} — endpoints under /api`);
  console.log(`Health: http://localhost:${port}/api/health`);
}

bootstrap();
