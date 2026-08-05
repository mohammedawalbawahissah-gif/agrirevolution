import { useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from "react-native";
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
  const { data: myOrders, refetch: refetchOrders } = useFetch<Paginated<Order>>(
    user ? `/marketplace/orders/?buyer=${user.id}` : null,
    [user?.id]
  );

  const [placingOrderFor, setPlacingOrderFor] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function handlePlaceOrder(listing: ProduceListing) {
    if (!user) return;
    setError("");
    setPlacingOrderFor(listing.id);
    try {
      const fallbackPrice = listing.fair_price_band_low_ghs ?? "0";
      await apiClient.post("/marketplace/orders/", {
        listing: listing.id,
        buyer: user.id,
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
                <Text style={styles.orderText}>Order #{o.id} — GHS {o.agreed_price_ghs}</Text>
                <Text style={styles.orderStatus}>{o.status}</Text>
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  orderText: { fontSize: 13 },
  orderStatus: { fontSize: 12, color: "#6B7280", textTransform: "capitalize" },
});
