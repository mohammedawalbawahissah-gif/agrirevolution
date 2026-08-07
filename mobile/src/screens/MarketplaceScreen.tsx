import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useFetch } from "../hooks/useFetch";
import { apiClient } from "../api/client";
import type { Paginated, PaymentChannel, ProduceListing } from "../types";
import { PAYMENT_CHANNEL_LABELS } from "../types";

const PAYMENT_CHANNELS = Object.keys(PAYMENT_CHANNEL_LABELS) as PaymentChannel[];
const DELIVERY_OPTIONS: { value: "pickup" | "delivery" | "both"; label: string }[] = [
  { value: "pickup", label: "Pickup Only" },
  { value: "delivery", label: "Delivery Only" },
  { value: "both", label: "Pickup or Delivery" },
];

export default function MarketplaceScreen() {
  const { user } = useAuth();
  const {
    data: listings,
    isLoading,
    refetch,
  } = useFetch<Paginated<ProduceListing>>(
    user ? `/marketplace/listings/?farmer=${user.id}` : null,
    [user?.id]
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [crop, setCrop] = useState("");
  const [quantity, setQuantity] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery" | "both">("pickup");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<PaymentChannel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function togglePaymentMethod(channel: PaymentChannel) {
    setAcceptedPaymentMethods((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  }

  async function handleAddListing() {
    if (!user) return;
    setError("");
    setIsSubmitting(true);
    try {
      await apiClient.post("/marketplace/listings/", {
        crop,
        quantity_kg: parseFloat(quantity),
        photo_url: photoUrl || undefined,
        listed_via: "app",
        delivery_method: deliveryMethod,
        delivery_location: deliveryLocation || undefined,
        accepted_payment_methods: acceptedPaymentMethods,
      });
      setCrop("");
      setQuantity("");
      setPhotoUrl("");
      setDeliveryMethod("pickup");
      setDeliveryLocation("");
      setAcceptedPaymentMethods([]);
      setModalVisible(false);
      refetch();
    } catch {
      setError("Could not list produce. Check the details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Marketplace</Text>
        <Text style={styles.subtitle}>Sell your produce with AI-graded fair pricing</Text>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={listings?.results ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardCrop}>
                {item.quantity_kg}kg {item.crop}
              </Text>
              <Text style={styles.cardStatus}>{item.status}</Text>
            </View>
            <Text style={styles.cardGrade}>
              Grade: {item.ai_grade === "ungraded" ? "Pending AI review" : item.ai_grade}
            </Text>
            {item.fair_price_band_low_ghs && item.fair_price_band_high_ghs && (
              <Text style={styles.cardPrice}>
                Fair price: GHS {item.fair_price_band_low_ghs} – {item.fair_price_band_high_ghs}
              </Text>
            )}
            {item.ai_grading_notes ? <Text style={styles.cardNotes}>{item.ai_grading_notes}</Text> : null}
            {item.delivery_location ? (
              <Text style={styles.cardNotes}>
                {item.delivery_method.replace("_", " ")} · {item.delivery_location}
              </Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No produce listed yet. Tap below to list your first sale.</Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+ List Produce</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>List Produce for Sale</Text>
            <TextInput style={styles.input} placeholder="Crop (e.g. Maize)" value={crop} onChangeText={setCrop} />
            <TextInput
              style={styles.input}
              placeholder="Quantity (kg)"
              keyboardType="decimal-pad"
              value={quantity}
              onChangeText={setQuantity}
            />
            <TextInput
              style={styles.input}
              placeholder="Photo URL (optional — enables AI grading)"
              autoCapitalize="none"
              value={photoUrl}
              onChangeText={setPhotoUrl}
            />
            <Text style={styles.fieldLabel}>Delivery</Text>
            <View style={styles.pillRow}>
              {DELIVERY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.pill, deliveryMethod === opt.value && styles.pillActive]}
                  onPress={() => setDeliveryMethod(opt.value)}
                >
                  <Text style={[styles.pillText, deliveryMethod === opt.value && styles.pillTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder={deliveryMethod === "pickup" ? "Pickup location" : "Location / delivery area"}
              value={deliveryLocation}
              onChangeText={setDeliveryLocation}
            />
            <Text style={styles.fieldLabel}>Accepted Payment Methods</Text>
            <View style={styles.pillRow}>
              {PAYMENT_CHANNELS.map((channel) => (
                <TouchableOpacity
                  key={channel}
                  style={[styles.pill, acceptedPaymentMethods.includes(channel) && styles.pillActive]}
                  onPress={() => togglePaymentMethod(channel)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      acceptedPaymentMethods.includes(channel) && styles.pillTextActive,
                    ]}
                  >
                    {PAYMENT_CHANNEL_LABELS[channel]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.submitButton} onPress={handleAddListing} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>List Produce</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
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
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardCrop: { fontSize: 16, fontWeight: "600" },
  cardStatus: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    textTransform: "capitalize",
  },
  cardGrade: { fontSize: 13, color: "#6B7280", marginTop: 6 },
  cardPrice: { fontSize: 13, fontWeight: "600", color: "#2F6B3C", marginTop: 4 },
  cardNotes: { fontSize: 12, color: "#9CA3AF", marginTop: 6, lineHeight: 16 },
  empty: { paddingTop: 60, paddingHorizontal: 12 },
  emptyText: { textAlign: "center", color: "#9CA3AF", fontSize: 14, lineHeight: 20 },
  fab: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: "#2F6B3C",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 15 },
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
  error: { color: "#DC2626", fontSize: 13, marginBottom: 8 },
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
  pillActive: { backgroundColor: "#2F6B3C", borderColor: "#2F6B3C" },
  pillText: { fontSize: 12, color: "#374151" },
  pillTextActive: { color: "#fff", fontWeight: "600" },
  submitButton: { backgroundColor: "#2F6B3C", borderRadius: 8, paddingVertical: 14, alignItems: "center" },
  submitButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  cancelText: { textAlign: "center", color: "#6B7280", marginTop: 12, fontSize: 14 },
});
