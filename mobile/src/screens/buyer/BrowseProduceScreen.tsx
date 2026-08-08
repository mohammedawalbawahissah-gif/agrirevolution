import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import type { Paginated, PaymentChannel, ProduceListing, Order } from "../../types";
import { PAYMENT_CHANNEL_LABELS } from "../../types";

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

  const [orderingListing, setOrderingListing] = useState<ProduceListing | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentChannel | "">("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState<Record<number, string>>({});

  function openOrderModal(listing: ProduceListing) {
    setError("");
    setOrderingListing(listing);
    setDeliveryMethod(listing.delivery_method === "delivery" ? "delivery" : "pickup");
    setDeliveryAddress("");
    setPaymentMethod(listing.accepted_payment_methods[0] ?? "");
  }

  async function handlePlaceOrder() {
    if (!orderingListing) return;
    setError("");
    if (deliveryMethod === "delivery" && !deliveryAddress.trim()) {
      setError("Delivery address is required for delivery orders.");
      return;
    }
    setBusyId(orderingListing.id);
    try {
      const fallbackPrice = orderingListing.fair_price_band_low_ghs ?? "0";
      await apiClient.post("/marketplace/orders/", {
        listing: orderingListing.id,
        agreed_price_ghs: fallbackPrice,
        delivery_method: deliveryMethod,
        delivery_address: deliveryMethod === "delivery" ? deliveryAddress : undefined,
        payment_method: paymentMethod || undefined,
      });
      setOrderingListing(null);
      refetchListings();
      refetchOrders();
    } catch {
      setError("Could not place order. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  function confirmCancel(order: Order) {
    Alert.alert("Cancel order", "Cancel this order?", [
      { text: "No", style: "cancel" },
      { text: "Yes, cancel", style: "destructive", onPress: () => cancelOrder(order) },
    ]);
  }

  async function cancelOrder(order: Order) {
    setBusyId(order.id);
    try {
      await apiClient.patch(`/marketplace/orders/${order.id}/`, { status: "cancelled" });
      refetchOrders();
    } finally {
      setBusyId(null);
    }
  }

  async function handlePay(order: Order) {
    setBusyId(order.id);
    setPaymentMessage((m) => ({ ...m, [order.id]: "" }));
    try {
      const { data: txn } = await apiClient.post("/payments/transactions/", {
        purpose: "produce_sale",
        channel: order.payment_method || "mtn_momo",
        amount_ghs: order.agreed_price_ghs,
        produce_order: order.id,
      });
      const { data } = await apiClient.post(`/payments/transactions/${txn.id}/initiate/`);
      setPaymentMessage((m) => ({ ...m, [order.id]: data.detail }));
    } catch {
      setPaymentMessage((m) => ({ ...m, [order.id]: "Payment could not be started. Try again." }));
    } finally {
      setBusyId(null);
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
            {item.delivery_location ? (
              <Text style={styles.cardMeta}>
                {item.delivery_method.replace("_", " ")} · {item.delivery_location}
              </Text>
            ) : null}
            <TouchableOpacity
              style={styles.orderButton}
              onPress={() => openOrderModal(item)}
              disabled={busyId === item.id}
            >
              {busyId === item.id ? (
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
                  <Text style={styles.paymentMessage}>
                    {o.delivery_method}
                    {o.delivery_method === "delivery" && o.delivery_address ? ` · ${o.delivery_address}` : ""}
                  </Text>
                  {paymentMessage[o.id] ? (
                    <Text style={styles.paymentMessage}>{paymentMessage[o.id]}</Text>
                  ) : null}
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderStatus}>{o.status}</Text>
                  {o.status === "accepted" && (
                    <TouchableOpacity onPress={() => handlePay(o)} disabled={busyId === o.id}>
                      <Text style={styles.payLink}>Pay via MoMo</Text>
                    </TouchableOpacity>
                  )}
                  {(o.status === "pending" || o.status === "accepted") && (
                    <TouchableOpacity onPress={() => confirmCancel(o)} disabled={busyId === o.id}>
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

      <Modal visible={!!orderingListing} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Order {orderingListing?.quantity_kg}kg {orderingListing?.crop}
            </Text>

            {orderingListing?.delivery_method === "both" ? (
              <>
                <Text style={styles.fieldLabel}>Delivery</Text>
                <View style={styles.pillRow}>
                  {(["pickup", "delivery"] as const).map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.pill, deliveryMethod === opt && styles.pillActive]}
                      onPress={() => setDeliveryMethod(opt)}
                    >
                      <Text style={[styles.pillText, deliveryMethod === opt && styles.pillTextActive]}>
                        {opt === "pickup" ? "Pickup" : "Delivery"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.cardMeta}>{orderingListing?.delivery_method} only</Text>
            )}

            {deliveryMethod === "delivery" && (
              <TextInput
                style={styles.input}
                placeholder="Delivery address"
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
              />
            )}

            <Text style={styles.fieldLabel}>Payment Method</Text>
            <View style={styles.pillRow}>
              {(orderingListing?.accepted_payment_methods ?? []).map((channel) => (
                <TouchableOpacity
                  key={channel}
                  style={[styles.pill, paymentMethod === channel && styles.pillActive]}
                  onPress={() => setPaymentMethod(channel)}
                >
                  <Text style={[styles.pillText, paymentMethod === channel && styles.pillTextActive]}>
                    {PAYMENT_CHANNEL_LABELS[channel]}
                  </Text>
                </TouchableOpacity>
              ))}
              {(orderingListing?.accepted_payment_methods.length ?? 0) === 0 && (
                <Text style={styles.cardMeta}>Not specified by farmer</Text>
              )}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity
              style={styles.orderButton}
              onPress={handlePlaceOrder}
              disabled={busyId === orderingListing?.id}
            >
              {busyId === orderingListing?.id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.orderButtonText}>Place Order</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOrderingListing(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    backgroundColor: "#B3543A",
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
  payLink: { fontSize: 12, color: "#B3543A", fontWeight: "600" },
  cancelLink: { fontSize: 12, color: "#DC2626", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  pill: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#fff",
  },
  pillActive: { backgroundColor: "#B3543A", borderColor: "#B3543A" },
  pillText: { fontSize: 12, color: "#374151" },
  pillTextActive: { color: "#fff", fontWeight: "600" },
  cancelText: { textAlign: "center", color: "#6B7280", marginTop: 12, fontSize: 14 },
});
