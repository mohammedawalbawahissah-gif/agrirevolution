import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Switch } from "react-native";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../api/client";
import { useFetch } from "../hooks/useFetch";
import { BUYER_TYPE_LABELS, type BuyerProfile, type BuyerType, type DealerProfile, type FarmerProfile } from "../types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const BUYER_TYPES = Object.keys(BUYER_TYPE_LABELS) as BuyerType[];

export default function AccountScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    phone_number: user?.phone_number ?? "",
    community: user?.community ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Role-specific profile (farm details for farmers, business details for
  // dealers/buyers) — mirrors the web app's per-role Account pages.
  const profileUrl =
    user?.role === "farmer"
      ? "/accounts/farmer-profiles/me/"
      : user?.role === "dealer"
      ? "/accounts/dealer-profiles/me/"
      : user?.role === "buyer"
      ? "/accounts/buyer-profiles/me/"
      : null;
  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useFetch<
    FarmerProfile | DealerProfile | BuyerProfile
  >(profileUrl);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [farmForm, setFarmForm] = useState({ farm_size_acres: "", primary_crops: "" });
  const [dealerForm, setDealerForm] = useState({ business_name: "", service_radius_km: "15", is_active: true });
  const [buyerForm, setBuyerForm] = useState<{ business_name: string; buyer_type: BuyerType | "" }>({
    business_name: "",
    buyer_type: "",
  });
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (!profile) return;
    if (user?.role === "farmer") {
      const p = profile as FarmerProfile;
      setFarmForm({ farm_size_acres: p.farm_size_acres ?? "", primary_crops: p.primary_crops ?? "" });
    } else if (user?.role === "dealer") {
      const p = profile as DealerProfile;
      setDealerForm({
        business_name: p.business_name ?? "",
        service_radius_km: String(p.service_radius_km ?? "15"),
        is_active: p.is_active ?? true,
      });
    } else if (user?.role === "buyer") {
      const p = profile as BuyerProfile;
      setBuyerForm({ business_name: p.business_name ?? "", buyer_type: p.buyer_type ?? "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function handleSaveProfile() {
    if (!profileUrl) return;
    setProfileError("");
    setIsSavingProfile(true);
    try {
      const payload =
        user!.role === "farmer"
          ? farmForm
          : user!.role === "dealer"
          ? { ...dealerForm, service_radius_km: Number(dealerForm.service_radius_km) || 0 }
          : buyerForm;
      await apiClient.patch(profileUrl, payload);
      refetchProfile();
      setIsEditingProfile(false);
    } catch {
      setProfileError("Could not save changes. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user.first_name?.[0] || user.username[0]).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>
          {user.first_name} {user.last_name}
        </Text>
        <Text style={styles.role}>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</Text>
      </View>

      {isEditing ? (
        <View style={styles.card}>
          <Text style={styles.label}>First name</Text>
          <TextInput
            style={styles.input}
            value={form.first_name}
            onChangeText={(v) => setForm({ ...form, first_name: v })}
          />
          <Text style={styles.label}>Last name</Text>
          <TextInput
            style={styles.input}
            value={form.last_name}
            onChangeText={(v) => setForm({ ...form, last_name: v })}
          />
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={form.phone_number}
            onChangeText={(v) => setForm({ ...form, phone_number: v })}
            keyboardType="phone-pad"
          />
          <Text style={styles.label}>Community</Text>
          <TextInput
            style={styles.input}
            value={form.community}
            onChangeText={(v) => setForm({ ...form, community: v })}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsEditing(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Row label="Username" value={user.username} />
          <Row label="Phone" value={user.phone_number || "—"} />
          <Row label="Community" value={user.community || "—"} />
          <Row label="District" value={user.district} />
          <Row label="Preferred language" value={user.preferred_language} />
          <Row label="Access mode" value={user.preferred_access_mode.toUpperCase()} />
          <TouchableOpacity onPress={() => setIsEditing(true)} style={{ paddingTop: 14 }}>
            <Text style={styles.editLink}>Edit profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {profileUrl && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {user.role === "farmer" ? "Farm details" : "Business details"}
          </Text>
          {isProfileLoading ? (
            <ActivityIndicator color="#2F6B3C" style={{ marginVertical: 12 }} />
          ) : isEditingProfile ? (
            <>
              {user.role === "farmer" && (
                <>
                  <Text style={styles.label}>Farm size (acres)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={farmForm.farm_size_acres}
                    onChangeText={(v) => setFarmForm({ ...farmForm, farm_size_acres: v })}
                    placeholder="e.g. 4.5"
                  />
                  <Text style={styles.label}>Primary crops</Text>
                  <TextInput
                    style={styles.input}
                    value={farmForm.primary_crops}
                    onChangeText={(v) => setFarmForm({ ...farmForm, primary_crops: v })}
                    placeholder="e.g. Maize, Soybean"
                  />
                </>
              )}
              {user.role === "dealer" && (
                <>
                  <Text style={styles.label}>Business name</Text>
                  <TextInput
                    style={styles.input}
                    value={dealerForm.business_name}
                    onChangeText={(v) => setDealerForm({ ...dealerForm, business_name: v })}
                    placeholder="e.g. Tamale Tractors Ltd"
                  />
                  <Text style={styles.label}>Service radius (km)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={dealerForm.service_radius_km}
                    onChangeText={(v) => setDealerForm({ ...dealerForm, service_radius_km: v })}
                  />
                  <View style={styles.switchRow}>
                    <Text style={styles.label}>Actively accepting bookings</Text>
                    <Switch
                      value={dealerForm.is_active}
                      onValueChange={(v) => setDealerForm({ ...dealerForm, is_active: v })}
                    />
                  </View>
                </>
              )}
              {user.role === "buyer" && (
                <>
                  <Text style={styles.label}>Business name</Text>
                  <TextInput
                    style={styles.input}
                    value={buyerForm.business_name}
                    onChangeText={(v) => setBuyerForm({ ...buyerForm, business_name: v })}
                    placeholder="e.g. Northern Wholesale"
                  />
                  <Text style={styles.label}>Buyer type</Text>
                  <View style={styles.pillRow}>
                    {BUYER_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.pill, buyerForm.buyer_type === t && styles.pillActive]}
                        onPress={() => setBuyerForm({ ...buyerForm, buyer_type: t })}
                      >
                        <Text style={[styles.pillText, buyerForm.buyer_type === t && styles.pillTextActive]}>
                          {BUYER_TYPE_LABELS[t]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              {profileError ? <Text style={styles.error}>{profileError}</Text> : null}
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsEditingProfile(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {user.role === "farmer" && (
                <>
                  <Row label="Farm size" value={farmForm.farm_size_acres ? `${farmForm.farm_size_acres} acres` : "—"} />
                  <Row label="Primary crops" value={farmForm.primary_crops || "—"} />
                </>
              )}
              {user.role === "dealer" && (
                <>
                  <Row label="Business name" value={dealerForm.business_name || "—"} />
                  <Row label="Service radius" value={`${dealerForm.service_radius_km} km`} />
                  <Row label="Accepting bookings" value={dealerForm.is_active ? "Yes" : "No"} />
                </>
              )}
              {user.role === "buyer" && (
                <>
                  <Row label="Business name" value={buyerForm.business_name || "—"} />
                  <Row label="Buyer type" value={buyerForm.buyer_type ? BUYER_TYPE_LABELS[buyerForm.buyer_type] : "—"} />
                </>
              )}
              <TouchableOpacity onPress={() => setIsEditingProfile(true)} style={{ paddingTop: 14 }}>
                <Text style={styles.editLink}>
                  Edit {user.role === "farmer" ? "farm details" : "business details"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 24 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#2F6B3C",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  name: { fontSize: 20, fontWeight: "700" },
  role: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111827", paddingTop: 14, paddingBottom: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowLabel: { fontSize: 14, color: "#6B7280" },
  rowValue: { fontSize: 14, fontWeight: "500" },
  label: { fontSize: 13, color: "#6B7280", marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  error: { color: "#DC2626", fontSize: 13, marginTop: 8 },
  saveButton: {
    backgroundColor: "#2F6B3C",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  cancelText: { textAlign: "center", color: "#6B7280", marginTop: 12, marginBottom: 12, fontSize: 13 },
  editLink: { color: "#2F6B3C", fontWeight: "600", fontSize: 14, paddingBottom: 14 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4, marginBottom: 4 },
  pill: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#fff",
  },
  pillActive: { backgroundColor: "#2F6B3C", borderColor: "#2F6B3C" },
  pillText: { fontSize: 12, color: "#374151" },
  pillTextActive: { color: "#fff", fontWeight: "600" },
  logoutButton: {
    borderWidth: 1,
    borderColor: "#DC2626",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: { color: "#DC2626", fontWeight: "600", fontSize: 15 },
});
