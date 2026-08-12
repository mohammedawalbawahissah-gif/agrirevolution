import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import { useFetch } from "../../hooks/useFetch";
import type { InputDealerProfile } from "../../types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

const SPECIALIZATIONS: InputDealerProfile["specialization"][] = ["seeds", "fertilizer", "agrochemical", "tools", "general"];
const SPECIALIZATION_LABELS: Record<InputDealerProfile["specialization"], string> = {
  seeds: "Seeds",
  fertilizer: "Fertilizer",
  agrochemical: "Agrochemical",
  tools: "Tools & Supplies",
  general: "General Agro-Input Store",
};

export default function InputDealerAccount() {
  const { user, refreshUser } = useAuth();
  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } =
    useFetch<InputDealerProfile>("/accounts/input-dealer-profiles/me/");

  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userForm, setUserForm] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    phone_number: user?.phone_number ?? "",
    community: user?.community ?? "",
  });

  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [businessForm, setBusinessForm] = useState({
    business_name: "",
    specialization: "general" as InputDealerProfile["specialization"],
    is_active: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile) {
      setBusinessForm({
        business_name: profile.business_name,
        specialization: profile.specialization,
        is_active: profile.is_active,
      });
    }
  }, [profile]);

  if (!user) return null;

  async function handleSaveUser() {
    setError("");
    setIsSaving(true);
    try {
      await apiClient.patch("/accounts/me/", userForm);
      await refreshUser();
      setIsEditingUser(false);
    } catch {
      setError("Could not save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveBusiness() {
    setError("");
    setIsSaving(true);
    try {
      await apiClient.patch("/accounts/input-dealer-profiles/me/", businessForm);
      refetchProfile();
      setIsEditingBusiness(false);
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
          <p className="text-sm text-gray-500">Input Dealer</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Personal details</p>
        {isEditingUser ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input
                  value={userForm.first_name}
                  onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input
                  value={userForm.last_name}
                  onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                value={userForm.phone_number}
                onChange={(e) => setUserForm({ ...userForm, phone_number: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Community</label>
              <input
                value={userForm.community}
                onChange={(e) => setUserForm({ ...userForm, community: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveUser}
                disabled={isSaving}
                className="bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setIsEditingUser(false)} className="text-sm text-gray-500">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Row label="Username" value={user.username} />
            <Row label="Phone" value={user.phone_number || "—"} />
            <Row label="Community" value={user.community || "—"} />
            <Row label="District" value={user.district} />
            <Row label="Preferred language" value={user.preferred_language} />
            <button
              onClick={() => setIsEditingUser(true)}
              className="mt-2 text-sm text-brand-green font-medium hover:underline"
            >
              Edit profile
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Business details</p>
        {isProfileLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : isEditingBusiness ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
              <input
                value={businessForm.business_name}
                onChange={(e) => setBusinessForm({ ...businessForm, business_name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g. Tamale Agro Supplies"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
              <select
                value={businessForm.specialization}
                onChange={(e) =>
                  setBusinessForm({ ...businessForm, specialization: e.target.value as InputDealerProfile["specialization"] })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
              >
                {SPECIALIZATIONS.map((s) => (
                  <option key={s} value={s}>
                    {SPECIALIZATION_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={businessForm.is_active}
                onChange={(e) => setBusinessForm({ ...businessForm, is_active: e.target.checked })}
              />
              Actively taking orders
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveBusiness}
                disabled={isSaving}
                className="bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setIsEditingBusiness(false)} className="text-sm text-gray-500">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Row label="Business name" value={profile?.business_name || "—"} />
            <Row label="Specialization" value={profile ? SPECIALIZATION_LABELS[profile.specialization] : "—"} />
            <Row label="Taking orders" value={profile?.is_active ? "Yes" : "No"} />
            <button
              onClick={() => setIsEditingBusiness(true)}
              className="mt-2 text-sm text-brand-green font-medium hover:underline"
            >
              Edit business details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
