import { UserRole } from "@drop/database";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}
