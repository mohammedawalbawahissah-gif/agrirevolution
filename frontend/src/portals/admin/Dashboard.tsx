import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import type { Paginated, User, Equipment, EquipmentBooking, ProduceListing } from "../../types";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-brand-green mt-1">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { data: users, isLoading: usersLoading } = useFetch<Paginated<User>>("/accounts/users/");
  const { data: equipment } = useFetch<Paginated<Equipment>>("/equipment/equipment/");
  const { data: bookings } = useFetch<Paginated<EquipmentBooking>>("/equipment/bookings/");
  const { data: listings } = useFetch<Paginated<ProduceListing>>("/marketplace/listings/");

  const farmerCount = users?.results.filter((u) => u.role === "farmer").length ?? 0;
  const dealerCount = users?.results.filter((u) => u.role === "dealer").length ?? 0;
  const buyerCount = users?.results.filter((u) => u.role === "buyer").length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {user?.first_name || user?.username}</p>
        </div>
        <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800">
          Sign out
        </button>
      </header>

      <main className="p-6 max-w-6xl mx-auto space-y-8">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Farmers" value={usersLoading ? "…" : farmerCount} />
          <StatCard label="Dealers" value={usersLoading ? "…" : dealerCount} />
          <StatCard label="Buyers" value={usersLoading ? "…" : buyerCount} />
          <StatCard label="Total Users" value={usersLoading ? "…" : users?.count ?? 0} />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Equipment Listed" value={equipment?.count ?? 0} />
          <StatCard label="Equipment Bookings" value={bookings?.count ?? 0} />
          <StatCard label="Produce Listings" value={listings?.count ?? 0} />
        </section>

        <section className="bg-white rounded-lg shadow">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">Recent Equipment Bookings</h2>
          </div>
          <div className="divide-y">
            {bookings?.results.slice(0, 8).map((b) => (
              <div key={b.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <span>Booking #{b.id} — {b.acreage} acres on {b.requested_date}</span>
                <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs capitalize">
                  {b.status.replace("_", " ")}
                </span>
              </div>
            ))}
            {bookings?.results.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">No bookings yet.</p>
            )}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">Recent Produce Listings</h2>
          </div>
          <div className="divide-y">
            {listings?.results.slice(0, 8).map((l) => (
              <div key={l.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <span>{l.quantity_kg}kg {l.crop}</span>
                <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs capitalize">
                  {l.status}
                </span>
              </div>
            ))}
            {listings?.results.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">No listings yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
