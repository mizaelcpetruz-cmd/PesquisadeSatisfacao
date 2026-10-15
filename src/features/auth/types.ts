export interface UserProfileAccess {
  userId: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  status: "pending" | "approved" | "rejected";
  role: "supervisor" | "operador";
  requirePasswordChange: boolean;
  currentEnvironment: "test" | "production";
}
