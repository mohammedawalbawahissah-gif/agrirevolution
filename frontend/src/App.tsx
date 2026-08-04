import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./portals/admin/Dashboard";
import DealerDashboard from "./portals/dealer/Dashboard";
import BuyerDashboard from "./portals/buyer/Dashboard";
import FarmerDashboard from "./portals/farmer/Dashboard";
import ProtectedRoute from "./routes/ProtectedRoute";

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dealer/*"
        element={
          <ProtectedRoute allowedRoles={["dealer"]}>
            <DealerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/buyer/*"
        element={
          <ProtectedRoute allowedRoles={["buyer"]}>
            <BuyerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/*"
        element={
          <ProtectedRoute allowedRoles={["farmer"]}>
            <FarmerDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<RootRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
