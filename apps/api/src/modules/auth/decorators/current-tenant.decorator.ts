import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

// Extrai o tenant ativo do header X-Tenant-ID.
// Validação de acesso do usuário ao tenant é responsabilidade do service.
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return req.headers["x-tenant-id"] as string | undefined;
  }
);
