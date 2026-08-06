import { useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import type { Paginated, ProduceListing, Order } from "../../types";

export default function BrowseProduceScreen() {
  const { user } = useAuth();
  const {
    data: listings,
    isLoading,
    refetch: refetchListings,
  } = useFetch<Paginated<ProduceListing>>("/marketplace/listings/?status=listed");
  // Backend already scopes /marketplace/orders/ to this buyer's own orders.
  const { data: myOrders, refetch: refetchOrders } = useFetch<Paginated<Order>>(
    user ? "/marketplace/orders/" : null,
    [user?.id]
  );

  const [placingOrderFor, setPlacingOrderFor] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState<Record<number, string>>({});

  async function handlePlaceOrder(listing: ProduceListing) {
    setError("");
    setPlacingOrderFor(listing.id);
    try {
      const fallbackPrice = listing.fair_price_band_low_ghs ?? "0";
      await apiClient.post("/marketplace/orders/", {
        listing: listing.id,
        agreed_price_ghs: fallbackPrice,
      });
      refetchListings();
      refetchOrders();
    } catch {
      setError("Could not place order. Please try again.");
    } finally {
      setPlacingOrderFor(null);
    }
  }

  function confirmCancel(order: Order) {
    Alert.alert("Cancel order", "Cancel this order?", [
      { text: "No", style: "cancel" },
      { text: "Yes, cancel", style: "destructive", onPress: () => cancelOrder(order) },
    ]);
  }

  async function cancelOrder(order: Order) {
    setPlacingOrderFor(order.id);
    try {
      await apiClient.patch(`/marketplace/orders/${order.id}/`, { status: "cancelled" });
      refetchOrders();
    } finally {
      setPlacingOrderFor(null);
    }
  }

  async function handlePay(order: Order) {
    setPlacingOrderFor(order.id);
    setPaymentMessage((m) => ({ ...m, [order.id]: "" }));
    try {
      const { data: txn } = await apiClient.post("/payments/transactions/", {
        purpose: "produce_sale",
        channel: "mtn_momo",
        amount_ghs: order.agreed_price_ghs,
        produce_order: order.id,
      });
      const { data } = await apiClient.post(`/payments/transactions/${txn.id}/initiate/`);
      setPaymentMessage((m) => ({ ...m, [order.id]: data.detail }));
    } catch {
      setPaymentMessage((m) => ({ ...m, [order.id]: "Payment could not be started. Try again." }));
    } finally {
      setPlacingOrderFor(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Marketplace</Text>
        <Text style={styles.subtitle}>Browse produce from farmers near you</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={listings?.results ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetchListings} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardCrop}>
              {item.quantity_kg}kg {item.crop}
            </Text>
            <Text style={styles.cardMeta}>
              Grade {item.ai_grade === "ungraded" ? "pending" : item.ai_grade}
              {item.fair_price_band_low_ghs && item.fair_price_band_high_ghs
                ? ` · GHS ${item.fair_price_band_low_ghs}–${item.fair_price_band_high_ghs}`
                : ""}
            </Text>
            <TouchableOpacity
              style={styles.orderButton}
              onPress={() => handlePlaceOrder(item)}
              disabled={placingOrderFor === item.id}
            >
              {placingOrderFor === item.id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.orderButtonText}>Place Order</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No produce listed right now.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={styles.ordersSection}>
            <Text style={styles.ordersTitle}>My Orders</Text>
            {myOrders?.results.map((o) => (
              <View key={o.id} style={styles.orderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderText}>Order #{o.id} — GHS {o.agreed_price_ghs}</Text>
                  {paymentMessage[o.id] ? (
                    <Text style={styles.paymentMessage}>{paymentMessage[o.id]}</Text>
                  ) : null}
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderStatus}>{o.status}</Text>
                  {o.status === "accepted" && (
                    <TouchableOpacity onPress={() => handlePay(o)} disabled={placingOrderFor === o.id}>
                      <Text style={styles.payLink}>Pay via MoMo</Text>
                    </TouchableOpacity>
                  )}
                  {(o.status === "pending" || o.status === "accepted") && (
                    <TouchableOpacity onPress={() => confirmCancel(o)} disabled={placingOrderFor === o.id}>
                      <Text style={styles.cancelLink}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            {myOrders?.results.length === 0 && <Text style={styles.emptyText}>No orders placed yet.</Text>}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  error: { color: "#DC2626", fontSize: 13, marginHorizontal: 20, marginBottom: 8 },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardCrop: { fontSize: 16, fontWeight: "600" },
  cardMeta: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  orderButton: {
    backgroundColor: "#2F6B3C",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 10,
  },
  orderButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  empty: { paddingTop: 20, paddingHorizontal: 12 },
  emptyText: { textAlign: "center", color: "#9CA3AF", fontSize: 14 },
  ordersSection: { marginTop: 16 },
  ordersTitle: { fontSize: 15, fontWeight: "600", marginBottom: 10 },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  orderText: { fontSize: 13 },
  paymentMessage: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  orderRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  orderStatus: { fontSize: 12, color: "#6B7280", textTransform: "capitalize" },
  payLink: { fontSize: 12, color: "#2F6B3C", fontWeight: "600" },
  cancelLink: { fontSize: 12, color: "#DC2626", fontWeight: "600" },
});
