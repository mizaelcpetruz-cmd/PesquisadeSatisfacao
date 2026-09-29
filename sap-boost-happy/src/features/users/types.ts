export interface UserItem {
  id: string;
  email: string | null;
  fullName: string | null;
  status: "approved";
  createdAt: string;
  role: "supervisor" | "operador";
}
