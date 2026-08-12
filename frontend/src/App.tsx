import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import Login from "./pages/Login";
import Register from "./pages/Register";

import AdminLayout from "./portals/admin/AdminLayout";
import AdminOverview from "./portals/admin/Overview";
import AdminUsers from "./portals/admin/Users";
import AdminEquipment from "./portals/admin/Equipment";
import AdminBookings from "./portals/admin/Bookings";
import AdminListings from "./portals/admin/Listings";
import AdminOrders from "./portals/admin/Orders";
import AdminInputProducts from "./portals/admin/InputProducts";
import AdminInputOrders from "./portals/admin/InputOrders";
import AdminCropHealth from "./portals/admin/CropHealth";
import AdminTransactions from "./portals/admin/Transactions";
import AdminAccount from "./portals/admin/Account";

import FarmerLayout from "./portals/farmer/FarmerLayout";
import FarmerOverview from "./portals/farmer/Overview";
import AIAssistant from "./portals/farmer/AIAssistant";
import EquipmentTab from "./portals/farmer/EquipmentTab";
import MarketplaceTab from "./portals/farmer/MarketplaceTab";
import FarmerInputs from "./portals/farmer/Inputs";
import FarmerOrders from "./portals/farmer/Orders";
import FarmerAccountTab from "./portals/farmer/AccountTab";

import DealerLayout from "./portals/dealer/DealerLayout";
import DealerOverview from "./portals/dealer/Overview";
import DealerEquipment from "./portals/dealer/Equipment";
import DealerBookings from "./portals/dealer/Bookings";
import DealerAccount from "./portals/dealer/Account";

import InputDealerLayout from "./portals/input-dealer/InputDealerLayout";
import InputDealerOverview from "./portals/input-dealer/Overview";
import InputDealerProducts from "./portals/input-dealer/Products";
import InputDealerOrders from "./portals/input-dealer/Orders";
import InputDealerAccount from "./portals/input-dealer/Account";

import BuyerLayout from "./portals/buyer/BuyerLayout";
import BuyerOverview from "./portals/buyer/Overview";
import BuyerMarketplace from "./portals/buyer/Marketplace";
import BuyerOrders from "./portals/buyer/Orders";
import BuyerAccount from "./portals/buyer/Account";

import ProtectedRoute from "./routes/ProtectedRoute";

// Role strings are single words except input_dealer, which uses a
// hyphenated URL segment for readability — everything else maps 1:1.
const ROLE_PATHS: Record<string, string> = { input_dealer: "input-dealer" };

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${ROLE_PATHS[user.role] ?? user.role}`} replace />;
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
        <Route path="input-products" element={<AdminInputProducts />} />
        <Route path="input-orders" element={<AdminInputOrders />} />
        <Route path="crop-health" element={<AdminCropHealth />} />
        <Route path="transactions" element={<AdminTransactions />} />
        <Route path="account" element={<AdminAccount />} />
      </Route>

      <Route
        path="/farmer"
        element={
          <ProtectedRoute allowedRoles={["farmer"]}>
            <FarmerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<FarmerOverview />} />
        <Route path="ai-assistant" element={<AIAssistant />} />
        <Route path="equipment" element={<EquipmentTab />} />
        <Route path="marketplace" element={<MarketplaceTab />} />
        <Route path="inputs" element={<FarmerInputs />} />
        <Route path="orders" element={<FarmerOrders />} />
        <Route path="account" element={<FarmerAccountTab />} />
      </Route>

      <Route
        path="/dealer"
        element={
          <ProtectedRoute allowedRoles={["dealer"]}>
            <DealerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DealerOverview />} />
        <Route path="equipment" element={<DealerEquipment />} />
        <Route path="bookings" element={<DealerBookings />} />
        <Route path="account" element={<DealerAccount />} />
      </Route>

      <Route
        path="/input-dealer"
        element={
          <ProtectedRoute allowedRoles={["input_dealer"]}>
            <InputDealerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<InputDealerOverview />} />
        <Route path="products" element={<InputDealerProducts />} />
        <Route path="orders" element={<InputDealerOrders />} />
        <Route path="account" element={<InputDealerAccount />} />
      </Route>

      <Route
        path="/buyer"
        element={
          <ProtectedRoute allowedRoles={["buyer"]}>
            <BuyerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<BuyerOverview />} />
        <Route path="marketplace" element={<BuyerMarketplace />} />
        <Route path="orders" element={<BuyerOrders />} />
        <Route path="account" element={<BuyerAccount />} />
      </Route>

      <Route path="/" element={<RootRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
