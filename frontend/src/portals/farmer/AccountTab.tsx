import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import { useFetch } from "../../hooks/useFetch";
import type { FarmerProfile } from "../../types";

export default function AccountTab() {
  const { user, refreshUser } = useAuth();
  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } =
    useFetch<FarmerProfile>("/accounts/farmer-profiles/me/");

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    phone_number: user?.phone_number ?? "",
    community: user?.community ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [isEditingFarm, setIsEditingFarm] = useState(false);
  const [farmForm, setFarmForm] = useState({
    farm_size_acres: "",
    primary_crops: "",
    gps_latitude: "",
    gps_longitude: "",
  });
  const [isSavingFarm, setIsSavingFarm] = useState(false);
  const [farmError, setFarmError] = useState("");

  useEffect(() => {
    if (profile) {
      setFarmForm({
        farm_size_acres: profile.farm_size_acres ?? "",
        primary_crops: profile.primary_crops ?? "",
        gps_latitude: profile.gps_latitude ?? "",
        gps_longitude: profile.gps_longitude ?? "",
      });
    }
  }, [profile]);

  if (!user) return null;

  async function handleSave() {
    setError("");
    setIsSaving(true);
    try {
      await apiClient.patch("/accounts/me/", form);
      await refreshUser();
      setIsEditing(false);
    } catch {
      setError("Could not save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveFarm() {
    setFarmError("");
    setIsSavingFarm(true);
    try {
      await apiClient.patch("/accounts/farmer-profiles/me/", {
        farm_size_acres: farmForm.farm_size_acres || null,
        primary_crops: farmForm.primary_crops,
        gps_latitude: farmForm.gps_latitude || null,
        gps_longitude: farmForm.gps_longitude || null,
      });
      refetchProfile();
      setIsEditingFarm(false);
    } catch {
      setFarmError("Could not save changes. Please try again.");
    } finally {
      setIsSavingFarm(false);
    }
  }

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

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Personal details</p>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Community</label>
              <input
                value={form.community}
                onChange={(e) => setForm({ ...form, community: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
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
            <Row label="Phone" value={user.phone_number || "—"} />
            <Row label="Community" value={user.community || "—"} />
            <Row label="District" value={user.district} />
            <Row label="Preferred language" value={user.preferred_language} />
            <Row label="Access mode" value={user.preferred_access_mode.toUpperCase()} />
            <button
              onClick={() => setIsEditing(true)}
              className="mt-2 text-sm text-brand-green font-medium hover:underline"
            >
              Edit profile
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Farm details</p>
        {isProfileLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : isEditingFarm ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Farm size (acres)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={farmForm.farm_size_acres}
                onChange={(e) => setFarmForm({ ...farmForm, farm_size_acres: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g. 4.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary crops</label>
              <input
                value={farmForm.primary_crops}
                onChange={(e) => setFarmForm({ ...farmForm, primary_crops: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g. Maize, Soybean"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GPS latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={farmForm.gps_latitude}
                  onChange={(e) => setFarmForm({ ...farmForm, gps_latitude: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GPS longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={farmForm.gps_longitude}
                  onChange={(e) => setFarmForm({ ...farmForm, gps_longitude: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
            {farmError && <p className="text-sm text-red-600">{farmError}</p>}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveFarm}
                disabled={isSavingFarm}
                className="bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50"
              >
                {isSavingFarm ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setIsEditingFarm(false)} className="text-sm text-gray-500">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Row label="Farm size" value={profile?.farm_size_acres ? `${profile.farm_size_acres} acres` : "—"} />
            <Row label="Primary crops" value={profile?.primary_crops || "—"} />
            <Row
              label="GPS location"
              value={
                profile?.gps_latitude && profile?.gps_longitude
                  ? `${profile.gps_latitude}, ${profile.gps_longitude}`
                  : "—"
              }
            />
            <button
              onClick={() => setIsEditingFarm(true)}
              className="mt-2 text-sm text-brand-green font-medium hover:underline"
            >
              Edit farm details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
