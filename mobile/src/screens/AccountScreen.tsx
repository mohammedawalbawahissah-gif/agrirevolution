import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../api/client";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

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
  logoutButton: {
    borderWidth: 1,
    borderColor: "#DC2626",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: { color: "#DC2626", fontWeight: "600", fontSize: 15 },
});
