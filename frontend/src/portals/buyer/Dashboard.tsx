import { useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import type { Paginated, ProduceListing, Order } from "../../types";

export default function BuyerDashboard() {
  const { user, logout } = useAuth();
  const {
    data: listings,
    isLoading,
    refetch: refetchListings,
  } = useFetch<Paginated<ProduceListing>>("/marketplace/listings/?status=listed");
  const { data: myOrders, refetch: refetchOrders } = useFetch<Paginated<Order>>(
    user ? `/marketplace/orders/?buyer=${user.id}` : null,
    [user?.id]
  );

  const [placingOrderFor, setPlacingOrderFor] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function handlePlaceOrder(listing: ProduceListing) {
    setError("");
    setPlacingOrderFor(listing.id);
    try {
      const fallbackPrice = listing.fair_price_band_low_ghs ?? "0";
      await apiClient.post("/marketplace/orders/", {
        listing: listing.id,
        buyer: user?.id,
        agreed_price_ghs: fallbackPrice,
      });
      refetchListings();
      refetchOrders();
    } catch {
      setError("Could not place order. Please try again.");
    } finally {
      setPlacingOrderFor(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Buyer Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {user?.first_name || user?.username}</p>
        </div>
        <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800">
          Sign out
        </button>
      </header>

      <main className="p-6 max-w-4xl mx-auto space-y-8">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <section className="bg-white rounded-lg shadow">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">Available Produce</h2>
          </div>
          <div className="divide-y">
            {isLoading && <p className="px-5 py-4 text-sm text-gray-400">Loading...</p>}
            {listings?.results.map((l) => (
              <div key={l.id} className="px-5 py-4 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">
                    {l.quantity_kg}kg {l.crop}
                  </p>
                  <p className="text-gray-500">
                    Grade {l.ai_grade === "ungraded" ? "pending" : l.ai_grade}
                    {l.fair_price_band_low_ghs && l.fair_price_band_high_ghs
                      ? ` · GHS ${l.fair_price_band_low_ghs}–${l.fair_price_band_high_ghs}`
                      : ""}
                  </p>
                </div>
                <button
                  onClick={() => handlePlaceOrder(l)}
                  disabled={placingOrderFor === l.id}
                  className="bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50"
                >
                  {placingOrderFor === l.id ? "Placing..." : "Place Order"}
                </button>
              </div>
            ))}
            {listings?.results.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">No produce listed right now.</p>
            )}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">My Orders</h2>
          </div>
          <div className="divide-y">
            {myOrders?.results.map((o) => (
              <div key={o.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <span>Order #{o.id} — GHS {o.agreed_price_ghs}</span>
                <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs capitalize">
                  {o.status}
                </span>
              </div>
            ))}
            {myOrders?.results.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">No orders placed yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
