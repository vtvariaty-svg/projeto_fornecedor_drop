import { TenantStatus, UserRole } from "@prisma/client";

export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  role: UserRole;
}
