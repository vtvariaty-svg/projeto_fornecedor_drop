import { Controller, Get, UseGuards } from "@nestjs/common";
import { TenantsService } from "./tenants.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";

@Controller("tenants")
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get("my")
  my(@CurrentUser() user: AuthenticatedUser) {
    return this.tenants.findForUser(user.id);
  }
}
