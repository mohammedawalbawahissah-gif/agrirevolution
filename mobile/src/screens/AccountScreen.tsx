import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useAuth } from "../context/AuthContext";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function AccountScreen() {
  const { user, logout } = useAuth();

  if (!user) return null;

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

      <View style={styles.card}>
        <Row label="Username" value={user.username} />
        <Row label="Phone" value={user.phone_number || "—"} />
        <Row label="Community" value={user.community || "—"} />
        <Row label="District" value={user.district} />
        <Row label="Preferred language" value={user.preferred_language} />
        <Row label="Access mode" value={user.preferred_access_mode.toUpperCase()} />
      </View>

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
  logoutButton: {
    borderWidth: 1,
    borderColor: "#DC2626",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: { color: "#DC2626", fontWeight: "600", fontSize: 15 },
});
