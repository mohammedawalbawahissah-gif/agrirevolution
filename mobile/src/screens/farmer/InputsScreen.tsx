import { useState, useMemo } from "react";
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
  Image,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import SearchInput from "../../components/ui/SearchInput";
import { colors, radius } from "../../theme/tokens";
import { INPUT_CATEGORY_LABELS } from "../../types";
import type { Paginated, InputProduct, InputOrder } from "../../types";

export default function FarmerInputsScreen() {
  const { user } = useAuth();
  const {
    data: products,
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useFetch<Paginated<InputProduct>>("/inputs/products/?active_only=true");
  const { data: orders, refetch: refetchOrders } = useFetch<Paginated<InputOrder>>(
    user ? "/inputs/orders/" : null,
    [user?.id]
  );
  const toast = useToast();

  const [search, setSearch] = useState("");
  const filteredProducts = useMemo(() => {
    if (!products?.results) return [];
    const q = search.trim().toLowerCase();
    if (!q) return products.results;
    return products.results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        INPUT_CATEGORY_LABELS[p.category].toLowerCase().includes(q) ||
        (p.dealer_name ?? "").toLowerCase().includes(q)
    );
  }, [products, search]);

  const [formTarget, setFormTarget] = useState<{ product: InputProduct; order?: InputOrder } | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("pickup");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function openOrderForm(product: InputProduct, order?: InputOrder) {
    setError("");
    setFormTarget({ product, order });
    setQuantity(order ? String(order.quantity) : "1");
    setDeliveryMethod(order?.delivery_method ?? "pickup");
    setDeliveryLocation(order?.delivery_location ?? "");
  }

  async function handleSubmitOrder() {
    if (!formTarget) return;
    setError("");
    setIsSubmitting(true);
    const payload = {
      quantity: parseInt(quantity, 10),
      delivery_method: deliveryMethod,
      delivery_location: deliveryLocation || undefined,
    };
    try {
      if (formTarget.order) {
        await apiClient.patch(`/inputs/orders/${formTarget.order.id}/`, payload);
        toast.success("Order updated.");
      } else {
        await apiClient.post("/inputs/orders/", { ...payload, product: formTarget.product.id });
        toast.success("Order placed.");
      }
      setFormTarget(null);
      refetchProducts();
      refetchOrders();
    } catch {
      setError("Could not save this order. Please check the quantity and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function confirmCancel(order: InputOrder) {
    Alert.alert("Cancel order", `Cancel order #${order.id}? This can't be undone.`, [
      { text: "No", style: "cancel" },
      { text: "Yes, cancel", style: "destructive", onPress: () => cancelOrder(order) },
    ]);
  }

  async function cancelOrder(order: InputOrder) {
    setBusyId(order.id);
    try {
      await apiClient.patch(`/inputs/orders/${order.id}/`, { status: "cancelled" });
      toast.success(`Order #${order.id} cancelled`);
      refetchProducts();
      refetchOrders();
    } catch {
      toast.error("Couldn't cancel this order.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Farm Inputs</Text>
        <Text style={styles.subtitle}>Seeds, fertilizer, and agrochemicals from input dealers</Text>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search products…" />
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={productsLoading} onRefresh={refetchProducts} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.photo_url ? <Image source={{ uri: item.photo_url }} style={styles.cardThumb} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardMeta}>
                GHS {item.price_ghs}/{item.unit} · {item.stock_quantity} in stock
              </Text>
              <Text style={styles.cardDealer}>
                {INPUT_CATEGORY_LABELS[item.category]} · {item.dealer_name}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.orderButton, item.stock_quantity === 0 && styles.orderButtonDisabled]}
              onPress={() => openOrderForm(item)}
              disabled={item.stock_quantity === 0}
            >
              <Text style={styles.orderButtonText}>{item.stock_quantity === 0 ? "Out" : "Order"}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !productsLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {search ? "No products match your search." : "No inputs available right now."}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          orders && orders.results.length > 0 ? (
            <View style={styles.ordersSection}>
              <Text style={styles.ordersTitle}>My Orders</Text>
              {orders.results.map((o) => (
                <View key={o.id} style={styles.orderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderText}>
                      {o.product_name} × {o.quantity}
                    </Text>
                    <Text style={styles.orderSubtext}>{o.total_price_ghs ? `GHS ${o.total_price_ghs}` : ""}</Text>
                  </View>
                  <View style={styles.orderRight}>
                    <StatusBadge status={o.status} />
                    {o.status === "pending" && (
                      <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                        <TouchableOpacity
                          onPress={() =>
                            openOrderForm(
                              products?.results.find((p) => p.id === o.product) ?? {
                                id: o.product,
                                dealer: 0,
                                name: o.product_name ?? "",
                                category: "other",
                                unit: "",
                                price_ghs: "0",
                                stock_quantity: 999999,
                                is_active: true,
                                description: "",
                                photo_url: "",
                                created_at: "",
                              },
                              o
                            )
                          }
                          disabled={busyId === o.id}
                        >
                          <Text style={styles.editLink}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmCancel(o)} disabled={busyId === o.id}>
                          <Text style={styles.cancelLink}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : null
        }
      />

      <Modal visible={!!formTarget} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {formTarget?.order ? "Edit Order" : `Order ${formTarget?.product.name}`}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Quantity"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={quantity}
              onChangeText={setQuantity}
            />
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
            {deliveryMethod === "delivery" && (
              <TextInput
                style={styles.input}
                placeholder="Delivery location"
                placeholderTextColor={colors.textMuted}
                value={deliveryLocation}
                onChangeText={setDeliveryLocation}
              />
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitOrder} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{formTarget?.order ? "Save Changes" : "Place Order"}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFormTarget(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brandCream },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardThumb: { width: 48, height: 48, borderRadius: radius.sm },
  cardName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cardDealer: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  orderButton: { backgroundColor: colors.brandGreen, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8 },
  orderButtonDisabled: { backgroundColor: colors.textMuted },
  orderButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  empty: { paddingTop: 20, paddingHorizontal: 12 },
  emptyText: { textAlign: "center", color: colors.textMuted, fontSize: 14 },
  ordersSection: { marginTop: 24 },
  ordersTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 10 },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderText: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  orderSubtext: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  orderRight: { alignItems: "flex-end" },
  editLink: { fontSize: 12, fontWeight: "600", color: colors.brandGreen },
  cancelLink: { fontSize: 12, fontWeight: "600", color: colors.statusDanger },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginBottom: 16 },
  input: {
    backgroundColor: colors.brandCream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  pillRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  pill: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8 },
  pillActive: { backgroundColor: colors.brandGreen, borderColor: colors.brandGreen },
  pillText: { fontSize: 13, color: "#374151" },
  pillTextActive: { color: "#fff", fontWeight: "600" },
  error: { color: colors.statusDanger, fontSize: 13, marginBottom: 8 },
  submitButton: { backgroundColor: colors.brandGreen, borderRadius: radius.sm, paddingVertical: 12, alignItems: "center" },
  submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cancelText: { textAlign: "center", color: colors.textSecondary, marginTop: 12, fontSize: 14 },
});
