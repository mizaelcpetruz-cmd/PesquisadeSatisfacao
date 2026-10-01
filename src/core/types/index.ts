/**
 * Global Core Types
 */

export type UserRole = "supervisor" | "operador";

export type EnvironmentMode = "test" | "production";

export interface UserAccessContext {
  userId: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  status: "approved";
  role: UserRole;
  requirePasswordChange: boolean;
  currentEnvironment: EnvironmentMode;
}
