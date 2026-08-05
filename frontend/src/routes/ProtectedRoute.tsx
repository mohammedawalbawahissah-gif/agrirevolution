import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

// Reads auth state from context (not localStorage directly), so it re-evaluates
// and redirects immediately when the user signs out — no reload required.
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
