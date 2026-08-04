import { Navigate } from "react-router-dom";
import type { UserRole } from "../types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

// Reads role from local storage for now; swap for a proper auth context
// once the login flow is wired to the backend's JWT endpoints.
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("user_role") as UserRole | null;

  if (!token) return <Navigate to="/login" replace />;
  if (role && !allowedRoles.includes(role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
