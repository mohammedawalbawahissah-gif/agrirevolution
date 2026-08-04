import { useAuth } from "../../context/AuthContext";

export default function FarmerDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">AgriRevolution</h1>
        <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800">
          Sign out
        </button>
      </header>
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-semibold mb-2">
            Hi {user?.first_name || user?.username} 👋
          </h2>
          <p className="text-gray-600">
            The farmer experience — weather guidance, equipment requests, and produce sales —
            lives in the AgriRevolution mobile app, so it works over voice/USSD too. Download
            the app or dial the USSD code to get started.
          </p>
        </div>
      </main>
    </div>
  );
}
