import { useAuth } from "../../context/AuthContext";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function BuyerAccount() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="p-8 max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-brand-green text-white flex items-center justify-center text-2xl font-bold">
          {(user.first_name?.[0] || user.username[0]).toUpperCase()}
        </div>
        <div>
          <p className="text-lg font-semibold">
            {user.first_name} {user.last_name}
          </p>
          <p className="text-sm text-gray-500 capitalize">{user.role}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <Row label="Username" value={user.username} />
        <Row label="Phone" value={user.phone_number || "—"} />
        <Row label="Community" value={user.community || "—"} />
        <Row label="District" value={user.district} />
        <Row label="Preferred language" value={user.preferred_language} />
      </div>
    </div>
  );
}
