export interface UserItem {
  id: string;
  email: string | null;
  fullName: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  role: "supervisor" | "operador";
}
