import { useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import DetailModal, { type DetailAction } from "../../components/ui/DetailModal";
import { colors, radius } from "../../theme/tokens";
import type { Order, Paginated } from "../../types";

/**
 * Farmer's side of the Order model — backend already scopes
 * GET /marketplace/orders/ to orders placed against this farmer's own
 * listings. Mirrors web's farmer/Orders.tsx: accept/decline while pending,
 * mark delivered once accepted/paid — no payment action, that's the buyer's.
 */
export default function OrdersScreen() {
  const { user } = useAuth();
  const { data: orders, isLoading, refetch } = useFetch<Paginated<Order>>(
    user ? "/marketplace/orders/" : null,
    [user?.id]
  );
  const toast = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);

  const openOrder = orders?.results.find((o) => o.id === openOrderId) ?? null;

  async function updateStatus(order: Order, status: Order["status"], successMessage: string) {
    setBusyId(order.id);
    try {
      await apiClient.patch(`/marketplace/orders/${order.id}/`, { status });
      toast.success(successMessage);
      setOpenOrderId(null);
      refetch();
    } catch {
      toast.error("Couldn't update this order.");
    } finally {
      setBusyId(null);
    }
  }

  function confirmDecline(order: Order) {
    Alert.alert(
      `Decline order #${order.id}?`,
      `${order.buyer_name ?? "The buyer"} will be notified. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Decline", style: "destructive", onPress: () => updateStatus(order, "cancelled", `Order #${order.id} declined`) },
      ]
    );
  }

  function actionsFor(order: Order): DetailAction[] {
    if (order.status === "pending") {
      return [
        { label: "Accept", variant: "primary", onPress: () => updateStatus(order, "accepted", `Order #${order.id} accepted`) },
        { label: "Decline", variant: "danger", onPress: () => confirmDecline(order) },
      ];
    }
    if (order.status === "accepted" || order.status === "paid") {
      return [
        {
          label: "Mark Delivered",
          variant: "primary",
          onPress: () => updateStatus(order, "delivered", `Order #${order.id} marked delivered`),
        },
      ];
    }
    return [];
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.subtitle}>Buyers who want to purchase your produce</Text>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={orders?.results ?? []}
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
                Order #{item.id} — {item.listing_crop}
              </Text>
              <Text style={styles.rowSubtitle}>
                GHS {item.agreed_price_ghs} · {item.buyer_name}
              </Text>
            </View>
            <StatusBadge status={item.status} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>When a buyer orders one of your listings, it'll show up here.</Text>
            </View>
          ) : null
        }
      />

      <DetailModal
        isOpen={openOrder !== null}
        onClose={() => setOpenOrderId(null)}
        title={`Order #${openOrder?.id ?? ""}`}
        status={openOrder?.status}
        isBusy={busyId === openOrder?.id}
        fields={
          openOrder
            ? [
                { label: "Produce", value: openOrder.listing_crop ?? "—" },
                { label: "Buyer", value: openOrder.buyer_name ?? "—" },
                { label: "Price", value: `GHS ${openOrder.agreed_price_ghs}` },
                { label: "Delivery", value: openOrder.delivery_method === "delivery" ? "Delivery" : "Pickup" },
                ...(openOrder.delivery_address ? [{ label: "Address", value: openOrder.delivery_address }] : []),
                { label: "Payment method", value: openOrder.payment_method || "—" },
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
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
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
