import { useState, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import SearchInput from "../../components/ui/SearchInput";
import DetailModal, { type DetailAction } from "../../components/ui/DetailModal";
import { colors, radius } from "../../theme/tokens";
import type { Paginated, InputOrder } from "../../types";

export default function InputOrdersScreen() {
  const { user } = useAuth();
  const { data: orders, isLoading, refetch } = useFetch<Paginated<InputOrder>>(
    user ? "/inputs/orders/" : null,
    [user?.id]
  );
  const toast = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const openOrder = orders?.results.find((o) => o.id === openOrderId) ?? null;

  const filtered = useMemo(() => {
    if (!orders?.results) return [];
    const q = search.trim().toLowerCase();
    if (!q) return orders.results;
    return orders.results.filter(
      (o) => (o.product_name ?? "").toLowerCase().includes(q) || (o.farmer_name ?? "").toLowerCase().includes(q)
    );
  }, [orders, search]);

  async function updateStatus(order: InputOrder, status: InputOrder["status"]) {
    setBusyId(order.id);
    try {
      await apiClient.patch(`/inputs/orders/${order.id}/`, { status });
      toast.success(`Order #${order.id} marked ${status}`);
      setOpenOrderId(null);
      refetch();
    } catch {
      toast.error("Couldn't update this order.");
    } finally {
      setBusyId(null);
    }
  }

  function actionsFor(o: InputOrder): DetailAction[] {
    switch (o.status) {
      case "pending":
        return [
          { label: "Confirm", variant: "primary", onPress: () => updateStatus(o, "confirmed") },
          { label: "Decline", variant: "danger", onPress: () => updateStatus(o, "cancelled") },
        ];
      case "confirmed":
        return [
          { label: "Mark Fulfilled", variant: "primary", onPress: () => updateStatus(o, "fulfilled") },
          { label: "Cancel", variant: "danger", onPress: () => updateStatus(o, "cancelled") },
        ];
      default:
        return [];
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.subtitle}>Requests farmers have placed against your products</Text>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search orders…" />
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, busyId === item.id && styles.rowBusy]}
            onPress={() => setOpenOrderId(item.id)}
            disabled={busyId === item.id}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>
                {item.product_name} × {item.quantity}
              </Text>
              <Text style={styles.rowSubtitle}>
                {item.farmer_name} {item.total_price_ghs ? `· GHS ${item.total_price_ghs}` : ""}
              </Text>
            </View>
            <StatusBadge status={item.status} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {search ? "No orders match your search." : "Orders farmers place will show up here."}
              </Text>
            </View>
          ) : null
        }
      />

      <DetailModal
        isOpen={openOrder !== null}
        onClose={() => setOpenOrderId(null)}
        title={openOrder?.product_name ?? `Order #${openOrder?.id ?? ""}`}
        status={openOrder?.status}
        isBusy={busyId === openOrder?.id}
        fields={
          openOrder
            ? [
                { label: "Product", value: openOrder.product_name ?? `#${openOrder.product}` },
                { label: "Farmer", value: openOrder.farmer_name ?? `#${openOrder.farmer}` },
                { label: "Quantity", value: String(openOrder.quantity) },
                { label: "Total", value: openOrder.total_price_ghs ? `GHS ${openOrder.total_price_ghs}` : "—" },
                { label: "Delivery", value: openOrder.delivery_method === "delivery" ? "Deliver to farmer" : "Farmer pickup" },
                { label: "Payment", value: openOrder.payment_channel || "Not specified" },
              ]
            : []
        }
        actions={openOrder ? actionsFor(openOrder) : []}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brandCream },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  rowBusy: { opacity: 0.5 },
  rowTitle: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  rowSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  empty: { paddingTop: 40, paddingHorizontal: 20 },
  emptyText: { textAlign: "center", color: colors.textMuted, fontSize: 14 },
});
