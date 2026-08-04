import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminDashboard from "./portals/admin/Dashboard";
import DealerDashboard from "./portals/dealer/Dashboard";
import BuyerDashboard from "./portals/buyer/Dashboard";
import FarmerDashboard from "./portals/farmer/Dashboard";
import ProtectedRoute from "./routes/ProtectedRoute";

function LoginPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">AgriRevolution — Sign In</h1>
      <p className="text-gray-600 mt-2">Wire up the login form against /api/accounts/token/ here.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
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
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
