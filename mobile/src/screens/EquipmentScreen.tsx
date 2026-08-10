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
import type { Paginated, Equipment, EquipmentBooking, PaymentChannel } from "../types";
import { PAYMENT_CHANNEL_LABELS } from "../types";

const PAYMENT_CHANNELS = Object.keys(PAYMENT_CHANNEL_LABELS) as PaymentChannel[];
const DELIVERY_OPTIONS: { value: "pickup" | "delivery"; label: string }[] = [
  { value: "pickup", label: "I'll pick it up" },
  { value: "delivery", label: "Deliver to me" },
];

export default function EquipmentScreen() {
  const { user } = useAuth();
  const {
    data: equipment,
    isLoading,
    refetch,
  } = useFetch<Paginated<Equipment>>("/equipment/equipment/?is_available=true");
  const { data: bookings, refetch: refetchBookings } = useFetch<Paginated<EquipmentBooking>>(
    user ? "/equipment/bookings/" : null,
    [user?.id]
  );

  const [formMode, setFormMode] = useState<
    { type: "create"; equipment: Equipment } | { type: "edit"; booking: EquipmentBooking } | null
  >(null);
  const [acreage, setAcreage] = useState("");
  const [date, setDate] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("pickup");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>("mtn_momo");
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState("");

  const [payingId, setPayingId] = useState<number | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<Record<number, string>>({});

  function openCreateForm(equipment: Equipment) {
    setFormMode({ type: "create", equipment });
    setAcreage("");
    setDate("");
    setDeliveryMethod("pickup");
    setDeliveryLocation("");
    setPaymentChannel("mtn_momo");
    setError("");
  }

  function openEditForm(booking: EquipmentBooking) {
    setFormMode({ type: "edit", booking });
    setAcreage(booking.acreage);
    setDate(booking.requested_date);
    setDeliveryMethod(booking.delivery_method);
    setDeliveryLocation(booking.delivery_location);
    setPaymentChannel((booking.payment_channel as PaymentChannel) || "mtn_momo");
    setError("");
  }

  async function handleSubmitBooking() {
    if (!formMode || !user) return;
    setError("");
    setIsBooking(true);
    const payload = {
      requested_date: date,
      acreage: parseFloat(acreage),
      delivery_method: deliveryMethod,
      delivery_location: deliveryLocation || undefined,
      payment_channel: paymentChannel,
    };
    try {
      if (formMode.type === "edit") {
        await apiClient.patch(`/equipment/bookings/${formMode.booking.id}/`, payload);
      } else {
        await apiClient.post("/equipment/bookings/", {
          ...payload,
          equipment: formMode.equipment.id,
          requested_via: "app",
        });
      }
      setFormMode(null);
      refetchBookings();
    } catch {
      setError("Could not save this request. Check the date format (YYYY-MM-DD) and try again.");
    } finally {
      setIsBooking(false);
    }
  }

  async function handlePay(booking: EquipmentBooking) {
    if (!booking.total_cost_ghs) return;
    setPayingId(booking.id);
    setPaymentMessage((m) => ({ ...m, [booking.id]: "" }));
    try {
      const { data: txn } = await apiClient.post("/payments/transactions/", {
        purpose: "equipment_booking",
        channel: booking.payment_channel || "mtn_momo",
        amount_ghs: booking.total_cost_ghs,
        equipment_booking: booking.id,
      });
      const { data } = await apiClient.post(`/payments/transactions/${txn.id}/initiate/`);
      setPaymentMessage((m) => ({ ...m, [booking.id]: data.detail }));
    } catch {
      setPaymentMessage((m) => ({ ...m, [booking.id]: "Payment could not be started. Try again." }));
    } finally {
      setPayingId(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Equipment</Text>
        <Text style={styles.subtitle}>Request mechanized equipment, pay per use via MoMo</Text>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={equipment?.results ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardCategory}>{item.category}</Text>
            <Text style={styles.cardRate}>GHS {item.rate_per_acre_ghs} / acre</Text>
            <TouchableOpacity style={styles.bookButton} onPress={() => openCreateForm(item)}>
              <Text style={styles.bookButtonText}>Request</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No equipment available right now.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          bookings && bookings.results.length > 0 ? (
            <View style={styles.bookingsSection}>
              <Text style={styles.bookingsTitle}>My Requests</Text>
              {bookings.results.map((b) => (
                <View key={b.id} style={styles.bookingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingText}>
                      {b.acreage} acres — {b.requested_date}
                      {b.total_cost_ghs ? ` · GHS ${b.total_cost_ghs}` : ""}
                    </Text>
                    {paymentMessage[b.id] ? (
                      <Text style={styles.paymentMessage}>{paymentMessage[b.id]}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.bookingStatus}>{b.status.replace("_", " ")}</Text>
                    {b.status === "requested" && (
                      <TouchableOpacity onPress={() => openEditForm(b)}>
                        <Text style={styles.payLink}>Edit</Text>
                      </TouchableOpacity>
                    )}
                    {(b.status === "confirmed" || b.status === "requested") && b.total_cost_ghs && (
                      <TouchableOpacity onPress={() => handlePay(b)} disabled={payingId === b.id}>
                        <Text style={styles.payLink}>
                          {payingId === b.id ? "Starting…" : "Pay via MoMo"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : null
        }
      />

      <Modal visible={!!formMode} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {formMode?.type === "edit" ? `Edit Request — ${formMode.booking.equipment_name ?? ""}` : `Request ${formMode?.type === "create" ? formMode.equipment.name : ""}`}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Acreage (e.g. 2.5)"
              keyboardType="decimal-pad"
              value={acreage}
              onChangeText={setAcreage}
            />
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
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
              placeholder={deliveryMethod === "pickup" ? "Pickup point" : "Delivery location"}
              value={deliveryLocation}
              onChangeText={setDeliveryLocation}
            />
            <Text style={styles.fieldLabel}>Payment Channel</Text>
            <View style={styles.pillRow}>
              {PAYMENT_CHANNELS.map((channel) => (
                <TouchableOpacity
                  key={channel}
                  style={[styles.pill, paymentChannel === channel && styles.pillActive]}
                  onPress={() => setPaymentChannel(channel)}
                >
                  <Text style={[styles.pillText, paymentChannel === channel && styles.pillTextActive]}>
                    {PAYMENT_CHANNEL_LABELS[channel]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.bookButton} onPress={handleSubmitBooking} disabled={isBooking}>
              {isBooking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.bookButtonText}>{formMode?.type === "edit" ? "Save Changes" : "Submit Request"}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFormMode(null)}>
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
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardName: { fontSize: 16, fontWeight: "600" },
  cardCategory: { fontSize: 13, color: "#6B7280", marginTop: 2, textTransform: "capitalize" },
  cardRate: { fontSize: 14, fontWeight: "600", color: "#B3543A", marginTop: 6 },
  bookButton: {
    backgroundColor: "#B3543A",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 10,
  },
  bookButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  empty: { paddingTop: 60, paddingHorizontal: 12 },
  emptyText: { textAlign: "center", color: "#9CA3AF", fontSize: 14 },
  bookingsSection: { marginTop: 8 },
  bookingsTitle: { fontSize: 15, fontWeight: "600", marginBottom: 10 },
  bookingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  bookingText: { fontSize: 13 },
  bookingStatus: { fontSize: 12, color: "#6B7280", textTransform: "capitalize" },
  payLink: { fontSize: 11, color: "#B3543A", fontWeight: "600", marginTop: 4 },
  paymentMessage: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
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
  pillActive: { backgroundColor: "#B3543A", borderColor: "#B3543A" },
  pillText: { fontSize: 12, color: "#374151" },
  pillTextActive: { color: "#fff", fontWeight: "600" },
  cancelText: { textAlign: "center", color: "#6B7280", marginTop: 12, fontSize: 14 },
});
