import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminLayout from "./portals/admin/AdminLayout";
import AdminOverview from "./portals/admin/Overview";
import AdminUsers from "./portals/admin/Users";
import AdminEquipment from "./portals/admin/Equipment";
import AdminBookings from "./portals/admin/Bookings";
import AdminListings from "./portals/admin/Listings";
import AdminOrders from "./portals/admin/Orders";
import AdminTransactions from "./portals/admin/Transactions";
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
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="equipment" element={<AdminEquipment />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="listings" element={<AdminListings />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="transactions" element={<AdminTransactions />} />
      </Route>
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
