import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../context/AuthContext";
import { useFetch } from "../hooks/useFetch";
import { apiClient } from "../api/client";
import type { Paginated, PlantingRecommendation, ProduceListing } from "../types";

const ACTION_LABELS: Record<PlantingRecommendation["recommended_action"], string> = {
  plant: "Time to plant",
  harvest: "Time to harvest",
  request_equipment: "Request equipment now",
  hold: "Hold — wait for better conditions",
};

export default function AIAssistantScreen() {
  const { user } = useAuth();

  // --- Weather guidance ---
  const {
    data: recommendations,
    isLoading: weatherLoading,
    refetch: refetchWeather,
  } = useFetch<Paginated<PlantingRecommendation>>(user ? "/weather/recommendations/" : null, [user?.id]);
  const [crop, setCrop] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  async function handleGenerate() {
    if (!crop.trim()) return;
    setWeatherError("");
    setIsGenerating(true);
    try {
      await apiClient.post("/weather/recommendations/generate/", { crop: crop.trim() });
      setCrop("");
      refetchWeather();
    } catch {
      setWeatherError("Could not get guidance right now. Please try again in a moment.");
    } finally {
      setIsGenerating(false);
    }
  }

  // --- Produce grading ---
  const {
    data: listings,
    isLoading: listingsLoading,
    refetch: refetchListings,
  } = useFetch<Paginated<ProduceListing>>(user ? "/marketplace/listings/" : null, [user?.id]);
  const [photoDrafts, setPhotoDrafts] = useState<Record<number, string>>({});
  const [mediaTypeDrafts, setMediaTypeDrafts] = useState<Record<number, "image" | "video" | "">>({});
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [gradeError, setGradeError] = useState<Record<number, string>>({});

  async function handlePickPhoto(listing: ProduceListing) {
    setGradeError((e) => ({ ...e, [listing.id]: "" }));
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setGradeError((e) => ({ ...e, [listing.id]: "Photo library permission is needed." }));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploadingId(listing.id);
    try {
      const formData = new FormData();
      // @ts-expect-error React Native's FormData file shape isn't the DOM File type
      formData.append("file", {
        uri: asset.uri,
        name: asset.fileName || "upload.jpg",
        type: asset.mimeType || "image/jpeg",
      });
      const { data } = await apiClient.post("/marketplace/upload-media/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPhotoDrafts((d) => ({ ...d, [listing.id]: data.url }));
      setMediaTypeDrafts((d) => ({ ...d, [listing.id]: data.media_type }));
    } catch {
      setGradeError((e) => ({ ...e, [listing.id]: "Upload failed. Please try a different photo." }));
    } finally {
      setUploadingId(null);
    }
  }

  async function handleGrade(listing: ProduceListing) {
    const draftUrl = photoDrafts[listing.id]?.trim();
    const draftMediaType = mediaTypeDrafts[listing.id];
    setGradeError((e) => ({ ...e, [listing.id]: "" }));
    setGradingId(listing.id);
    try {
      if (draftUrl && draftUrl !== listing.photo_url) {
        await apiClient.patch(`/marketplace/listings/${listing.id}/`, {
          photo_url: draftUrl,
          media_type: draftMediaType || undefined,
        });
      }
      await apiClient.post(`/marketplace/listings/${listing.id}/grade/`);
      refetchListings();
    } catch {
      setGradeError((e) => ({ ...e, [listing.id]: "Grading failed — check the photo and try again." }));
    } finally {
      setGradingId(null);
    }
  }

  const ungraded = listings?.results.filter((l) => l.ai_grade === "ungraded") ?? [];
  const graded = listings?.results.filter((l) => l.ai_grade !== "ungraded") ?? [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={weatherLoading || listingsLoading}
          onRefresh={() => {
            refetchWeather();
            refetchListings();
          }}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>AI Assistant</Text>
        <Text style={styles.subtitle}>Weather guidance and produce grading, powered by AI</Text>
      </View>

      {/* Weather guidance */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Weather Guidance</Text>
      </View>

      <View style={styles.generateCard}>
        <Text style={styles.generateLabel}>Get guidance for a crop</Text>
        <View style={styles.generateRow}>
          <TextInput
            style={styles.generateInput}
            placeholder="e.g. Maize"
            value={crop}
            onChangeText={setCrop}
          />
          <TouchableOpacity
            style={[styles.generateButton, (!crop.trim() || isGenerating) && styles.disabled]}
            onPress={handleGenerate}
            disabled={!crop.trim() || isGenerating}
          >
            {isGenerating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.generateButtonText}>Ask</Text>}
          </TouchableOpacity>
        </View>
        {weatherError ? <Text style={styles.error}>{weatherError}</Text> : null}
      </View>

      <View style={styles.list}>
        {recommendations?.results.map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.cardCrop}>{r.crop}</Text>
            <Text style={styles.cardAction}>{ACTION_LABELS[r.recommended_action]}</Text>
            <Text style={styles.cardWindow}>
              {r.recommended_window_start} – {r.recommended_window_end}
            </Text>
            <Text style={styles.cardRationale}>{r.ai_rationale}</Text>
          </View>
        ))}
        {!weatherLoading && recommendations?.results.length === 0 && (
          <Text style={styles.emptyText}>No weather guidance yet — ask above for your first crop.</Text>
        )}
      </View>

      {/* Produce grading */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Produce Grading</Text>
        <Text style={styles.sectionSubtitle}>Add a photo to any listing for an AI-assessed grade and fair price</Text>
      </View>

      <View style={styles.list}>
        {ungraded.map((listing) => (
          <View key={listing.id} style={styles.gradeCard}>
            <Text style={styles.cardCrop}>
              {listing.quantity_kg}kg {listing.crop}
            </Text>
            {(photoDrafts[listing.id] ?? listing.photo_url) ? (
              <Image source={{ uri: photoDrafts[listing.id] ?? listing.photo_url }} style={styles.photoThumb} />
            ) : null}
            <TouchableOpacity
              style={styles.photoPickButton}
              onPress={() => handlePickPhoto(listing)}
              disabled={uploadingId === listing.id}
            >
              {uploadingId === listing.id ? (
                <ActivityIndicator color="#2F6B3C" size="small" />
              ) : (
                <Text style={styles.photoPickButtonText}>
                  {(photoDrafts[listing.id] ?? listing.photo_url) ? "Change photo" : "📷 Choose photo"}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.generateButton,
                { alignSelf: "flex-start", paddingHorizontal: 16 },
                (gradingId === listing.id || !(photoDrafts[listing.id] ?? listing.photo_url)) && styles.disabled,
              ]}
              onPress={() => handleGrade(listing)}
              disabled={gradingId === listing.id || !(photoDrafts[listing.id] ?? listing.photo_url)}
            >
              {gradingId === listing.id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.generateButtonText}>Grade with AI</Text>
              )}
            </TouchableOpacity>
            {gradeError[listing.id] ? <Text style={styles.error}>{gradeError[listing.id]}</Text> : null}
          </View>
        ))}
        {ungraded.length === 0 && !listingsLoading && (
          <Text style={styles.emptyText}>No ungraded listings right now.</Text>
        )}

        {graded.length > 0 && (
          <>
            <Text style={styles.gradedLabel}>Already graded</Text>
            {graded.map((listing) => (
              <View key={listing.id} style={styles.gradedRow}>
                <Text style={styles.cardCrop}>
                  {listing.quantity_kg}kg {listing.crop}
                </Text>
                <Text style={styles.gradedBadge}>Grade {listing.ai_grade}</Text>
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  generateCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  generateLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  generateRow: { flexDirection: "row", gap: 8 },
  generateInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  generateButton: {
    backgroundColor: "#2F6B3C",
    borderRadius: 8,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  disabled: { opacity: 0.5 },
  generateButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  error: { color: "#DC2626", fontSize: 12, marginTop: 8 },
  list: { paddingHorizontal: 20, paddingBottom: 8 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  gradeCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  photoInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  photoThumb: { width: 60, height: 60, borderRadius: 8 },
  photoPickButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  photoPickButtonText: { color: "#2F6B3C", fontWeight: "600", fontSize: 13 },
  cardCrop: { fontSize: 16, fontWeight: "600" },
  cardAction: { fontSize: 14, color: "#2F6B3C", fontWeight: "600", marginTop: 4 },
  cardWindow: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  cardRationale: { fontSize: 13, color: "#374151", marginTop: 8, lineHeight: 18 },
  emptyText: { textAlign: "center", color: "#9CA3AF", fontSize: 14, lineHeight: 20, paddingVertical: 20 },
  gradedLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginTop: 8, marginBottom: 8 },
  gradedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  gradedBadge: { fontSize: 13, fontWeight: "600", color: "#2F6B3C" },
});
