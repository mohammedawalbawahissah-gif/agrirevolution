import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

const ACCESS_MODES = [
  { value: "app", label: "Smartphone App" },
  { value: "ussd", label: "USSD" },
  { value: "voice", label: "Voice" },
] as const;

export default function AdminAccount() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    phone_number: user?.phone_number ?? "",
    community: user?.community ?? "",
    district: user?.district ?? "",
    preferred_language: user?.preferred_language ?? "",
    preferred_access_mode: user?.preferred_access_mode ?? "app",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  function startEditing() {
    // Reset the form to the current user each time editing opens, so a
    // previously-cancelled edit never leaks stale values back in.
    setForm({
      first_name: user!.first_name ?? "",
      last_name: user!.last_name ?? "",
      phone_number: user!.phone_number ?? "",
      community: user!.community ?? "",
      district: user!.district ?? "",
      preferred_language: user!.preferred_language ?? "",
      preferred_access_mode: user!.preferred_access_mode ?? "app",
    });
    setError("");
    setIsEditing(true);
  }

  async function handleSave() {
    setError("");
    setIsSaving(true);
    try {
      await apiClient.patch("/accounts/me/", form);
      await refreshUser();
      toast.success("Profile updated");
      setIsEditing(false);
    } catch {
      setError("Could not save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-lg space-y-6">
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
        {isEditing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Community</label>
                <input
                  value={form.community}
                  onChange={(e) => setForm({ ...form, community: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                <input
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred language</label>
                <input
                  value={form.preferred_language}
                  onChange={(e) => setForm({ ...form, preferred_language: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Access mode</label>
                <select
                  value={form.preferred_access_mode}
                  onChange={(e) =>
                    setForm({ ...form, preferred_access_mode: e.target.value as typeof form.preferred_access_mode })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  {ACCESS_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setIsEditing(false)} className="text-sm text-gray-500">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Row label="Username" value={user.username} />
            <Row label="First name" value={user.first_name || "—"} />
            <Row label="Last name" value={user.last_name || "—"} />
            <Row label="Phone" value={user.phone_number || "—"} />
            <Row label="Community" value={user.community || "—"} />
            <Row label="District" value={user.district || "—"} />
            <Row label="Preferred language" value={user.preferred_language || "—"} />
            <Row label="Access mode" value={user.preferred_access_mode.toUpperCase()} />
            <button
              onClick={startEditing}
              className="mt-2 text-sm text-brand-green font-medium hover:underline"
            >
              Edit profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
