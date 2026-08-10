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
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../context/AuthContext";
import { useFetch } from "../hooks/useFetch";
import { apiClient } from "../api/client";
import { useToast } from "../context/ToastContext";
import type { Paginated, PaymentChannel, ProduceListing } from "../types";
import { PAYMENT_CHANNEL_LABELS } from "../types";

const PAYMENT_CHANNELS = Object.keys(PAYMENT_CHANNEL_LABELS) as PaymentChannel[];
const DELIVERY_OPTIONS: { value: "pickup" | "delivery" | "both"; label: string }[] = [
  { value: "pickup", label: "Pickup Only" },
  { value: "delivery", label: "Delivery Only" },
  { value: "both", label: "Pickup or Delivery" },
];
const GRADES: ("A" | "B" | "C")[] = ["A", "B", "C"];

export default function MarketplaceScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const {
    data: listings,
    isLoading,
    refetch,
  } = useFetch<Paginated<ProduceListing>>(
    user ? `/marketplace/listings/?farmer=${user.id}` : null,
    [user?.id]
  );

  const [formTarget, setFormTarget] = useState<"new" | ProduceListing | null>(null);
  const [crop, setCrop] = useState("");
  const [quantity, setQuantity] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "">("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery" | "both">("pickup");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<PaymentChannel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isEditing = formTarget !== null && formTarget !== "new";

  const [gradingListing, setGradingListing] = useState<ProduceListing | null>(null);
  const [manualGrade, setManualGrade] = useState<"A" | "B" | "C">("B");
  const [manualNotes, setManualNotes] = useState("");
  const [manualPriceLow, setManualPriceLow] = useState("");
  const [manualPriceHigh, setManualPriceHigh] = useState("");
  const [isGrading, setIsGrading] = useState(false);

  function openCreateForm() {
    setFormTarget("new");
    setCrop("");
    setQuantity("");
    setMediaUrl("");
    setMediaType("");
    setDeliveryMethod("pickup");
    setDeliveryLocation("");
    setAcceptedPaymentMethods([]);
    setError("");
  }

  function openEditForm(listing: ProduceListing) {
    setFormTarget(listing);
    setCrop(listing.crop);
    setQuantity(listing.quantity_kg);
    setMediaUrl(listing.photo_url);
    setMediaType(listing.media_type);
    setDeliveryMethod(listing.delivery_method);
    setDeliveryLocation(listing.delivery_location);
    setAcceptedPaymentMethods(listing.accepted_payment_methods);
    setError("");
  }

  function togglePaymentMethod(channel: PaymentChannel) {
    setAcceptedPaymentMethods((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  }

  async function handlePickMedia() {
    setUploadError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setUploadError("Photo library permission is needed to attach a photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setIsUploading(true);
    try {
      const formData = new FormData();
      // @ts-expect-error React Native's FormData file shape isn't the DOM File type
      formData.append("file", {
        uri: asset.uri,
        name: asset.fileName || (asset.type === "video" ? "upload.mp4" : "upload.jpg"),
        type: asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg"),
      });
      const { data } = await apiClient.post("/marketplace/upload-media/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMediaUrl(data.url);
      setMediaType(data.media_type);
    } catch {
      setUploadError("Upload failed. Please try a different photo or video.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmitListing() {
    if (!user) return;
    setError("");
    setIsSubmitting(true);
    const payload = {
      crop,
      quantity_kg: parseFloat(quantity),
      photo_url: mediaUrl || undefined,
      media_type: mediaType || undefined,
      delivery_method: deliveryMethod,
      delivery_location: deliveryLocation || undefined,
      accepted_payment_methods: acceptedPaymentMethods,
    };
    try {
      if (isEditing) {
        await apiClient.patch(`/marketplace/listings/${formTarget.id}/`, payload);
        toast.success("Listing updated.");
      } else {
        await apiClient.post("/marketplace/listings/", { ...payload, listed_via: "app" });
        toast.success("Produce listed.");
      }
      setFormTarget(null);
      refetch();
    } catch {
      setError(isEditing ? "Could not save changes. Check the details and try again." : "Could not list produce. Check the details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openManualGrade(listing: ProduceListing) {
    setGradingListing(listing);
    setManualGrade(listing.ai_grade === "ungraded" ? "B" : (listing.ai_grade as "A" | "B" | "C"));
    setManualNotes("");
    setManualPriceLow(listing.fair_price_band_low_ghs ?? "");
    setManualPriceHigh(listing.fair_price_band_high_ghs ?? "");
  }

  async function handleManualGrade() {
    if (!gradingListing) return;
    setIsGrading(true);
    try {
      await apiClient.post(`/marketplace/listings/${gradingListing.id}/manual-grade/`, {
        grade: manualGrade,
        notes: manualNotes,
        price_band_low_ghs: manualPriceLow || undefined,
        price_band_high_ghs: manualPriceHigh || undefined,
      });
      toast.success("Grade saved.");
      setGradingListing(null);
      refetch();
    } catch {
      toast.error("Could not save your grade. Please try again.");
    } finally {
      setIsGrading(false);
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
              Grade:{" "}
              {item.ai_grade === "ungraded"
                ? "Not graded yet"
                : `${item.ai_grade}${item.grading_source === "manual" ? " (self-graded)" : item.grading_source === "ai" ? " (AI graded)" : ""}`}
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
            <TouchableOpacity onPress={() => openManualGrade(item)}>
              <Text style={styles.gradeLink}>
                {item.ai_grade === "ungraded" ? "Grade it yourself" : "Edit grade"}
              </Text>
            </TouchableOpacity>
            {item.status !== "sold" && (
              <TouchableOpacity onPress={() => openEditForm(item)}>
                <Text style={styles.gradeLink}>Edit listing</Text>
              </TouchableOpacity>
            )}
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

      <TouchableOpacity style={styles.fab} onPress={openCreateForm}>
        <Text style={styles.fabText}>+ List Produce</Text>
      </TouchableOpacity>

      <Modal visible={formTarget !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditing ? "Edit Listing" : "List Produce for Sale"}</Text>
            <TextInput style={styles.input} placeholder="Crop (e.g. Maize)" value={crop} onChangeText={setCrop} />
            <TextInput
              style={styles.input}
              placeholder="Quantity (kg)"
              keyboardType="decimal-pad"
              value={quantity}
              onChangeText={setQuantity}
            />

            <Text style={styles.fieldLabel}>Photo or Video (optional — a photo enables AI grading)</Text>
            {mediaUrl ? (
              <View style={styles.mediaPreviewRow}>
                {mediaType === "image" && <Image source={{ uri: mediaUrl }} style={styles.mediaThumb} />}
                <Text style={styles.mediaPreviewText}>
                  {mediaType === "video" ? "Video attached" : "Photo attached"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setMediaUrl("");
                    setMediaType("");
                  }}
                >
                  <Text style={styles.removeMediaText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadButton} onPress={handlePickMedia} disabled={isUploading}>
                {isUploading ? (
                  <ActivityIndicator color="#B3543A" />
                ) : (
                  <Text style={styles.uploadButtonText}>📷 Choose photo or video</Text>
                )}
              </TouchableOpacity>
            )}
            {uploadError ? <Text style={styles.error}>{uploadError}</Text> : null}

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
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitListing}
              disabled={isSubmitting || isUploading}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{isEditing ? "Save Changes" : "List Produce"}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFormTarget(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!gradingListing} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Grade {gradingListing?.quantity_kg}kg {gradingListing?.crop}
            </Text>
            <Text style={styles.gradeHint}>
              No photo, or you know your produce better than a picture can show? Grade it yourself.
            </Text>

            <Text style={styles.fieldLabel}>Grade</Text>
            <View style={styles.pillRow}>
              {GRADES.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.gradeOption, manualGrade === g && styles.pillActive]}
                  onPress={() => setManualGrade(g)}
                >
                  <Text style={[styles.gradeOptionText, manualGrade === g && styles.pillTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Notes (optional)"
              value={manualNotes}
              onChangeText={setManualNotes}
              multiline
            />
            <View style={styles.priceRow}>
              <TextInput
                style={[styles.input, styles.priceInput]}
                placeholder="Price low (GHS)"
                keyboardType="decimal-pad"
                value={manualPriceLow}
                onChangeText={setManualPriceLow}
              />
              <TextInput
                style={[styles.input, styles.priceInput]}
                placeholder="Price high (GHS)"
                keyboardType="decimal-pad"
                value={manualPriceHigh}
                onChangeText={setManualPriceHigh}
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleManualGrade} disabled={isGrading}>
              {isGrading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Save Grade</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setGradingListing(null)}>
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
  cardPrice: { fontSize: 13, fontWeight: "600", color: "#B3543A", marginTop: 4 },
  cardNotes: { fontSize: 12, color: "#9CA3AF", marginTop: 6, lineHeight: 16 },
  gradeLink: { fontSize: 12, color: "#B3543A", fontWeight: "600", marginTop: 8 },
  empty: { paddingTop: 60, paddingHorizontal: 12 },
  emptyText: { textAlign: "center", color: "#9CA3AF", fontSize: 14, lineHeight: 20 },
  fab: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: "#B3543A",
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
  pillActive: { backgroundColor: "#B3543A", borderColor: "#B3543A" },
  pillText: { fontSize: 12, color: "#374151" },
  pillTextActive: { color: "#fff", fontWeight: "600" },
  submitButton: { backgroundColor: "#B3543A", borderRadius: 8, paddingVertical: 14, alignItems: "center" },
  submitButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  cancelText: { textAlign: "center", color: "#6B7280", marginTop: 12, fontSize: 14 },
  uploadButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  uploadButtonText: { color: "#B3543A", fontWeight: "600", fontSize: 14 },
  mediaPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  mediaThumb: { width: 44, height: 44, borderRadius: 6 },
  mediaPreviewText: { flex: 1, fontSize: 12, color: "#6B7280" },
  removeMediaText: { fontSize: 12, color: "#B3403A", fontWeight: "600" },
  gradeHint: { fontSize: 12, color: "#6B7280", marginBottom: 14 },
  gradeOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  gradeOptionText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  priceRow: { flexDirection: "row", gap: 10 },
  priceInput: { flex: 1 },
});
