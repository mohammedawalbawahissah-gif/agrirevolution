import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import type { Paginated, User, Equipment, EquipmentBooking, ProduceListing } from "../../types";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useFetch<Paginated<User>>(
    "/accounts/users/"
  );
  const { data: equipment } = useFetch<Paginated<Equipment>>("/equipment/equipment/");
  const { data: bookings } = useFetch<Paginated<EquipmentBooking>>("/equipment/bookings/");
  const { data: listings } = useFetch<Paginated<ProduceListing>>("/marketplace/listings/");

  const farmerCount = users?.results.filter((u) => u.role === "farmer").length ?? 0;
  const dealerCount = users?.results.filter((u) => u.role === "dealer").length ?? 0;
  const buyerCount = users?.results.filter((u) => u.role === "buyer").length ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={usersLoading} onRefresh={refetchUsers} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Welcome back, {user?.first_name || user?.username}</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Farmers" value={usersLoading ? "…" : farmerCount} />
        <StatCard label="Dealers" value={usersLoading ? "…" : dealerCount} />
        <StatCard label="Buyers" value={usersLoading ? "…" : buyerCount} />
        <StatCard label="Total Users" value={usersLoading ? "…" : users?.count ?? 0} />
        <StatCard label="Equipment" value={equipment?.count ?? 0} />
        <StatCard label="Bookings" value={bookings?.count ?? 0} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Equipment Bookings</Text>
        {bookings?.results.slice(0, 8).map((b) => (
          <View key={b.id} style={styles.row}>
            <Text style={styles.rowText}>
              Booking #{b.id} — {b.acreage} acres on {b.requested_date}
            </Text>
            <Text style={styles.rowBadge}>{b.status.replace("_", " ")}</Text>
          </View>
        ))}
        {bookings?.results.length === 0 && <Text style={styles.emptyText}>No bookings yet.</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Produce Listings</Text>
        {listings?.results.slice(0, 8).map((l) => (
          <View key={l.id} style={styles.row}>
            <Text style={styles.rowText}>
              {l.quantity_kg}kg {l.crop}
            </Text>
            <Text style={styles.rowBadge}>{l.status}</Text>
          </View>
        ))}
        {listings?.results.length === 0 && <Text style={styles.emptyText}>No listings yet.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    width: "31%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statLabel: { fontSize: 11, color: "#6B7280" },
  statValue: { fontSize: 20, fontWeight: "700", color: "#2F6B3C", marginTop: 4 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: "600", marginBottom: 10 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowText: { fontSize: 13, flex: 1, paddingRight: 8 },
  rowBadge: { fontSize: 11, color: "#6B7280", textTransform: "capitalize" },
  emptyText: { fontSize: 13, color: "#9CA3AF" },
});
