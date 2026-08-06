import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useFetch } from "../hooks/useFetch";
import { apiClient } from "../api/client";
import type { Paginated, PlantingRecommendation } from "../types";

const ACTION_LABELS: Record<PlantingRecommendation["recommended_action"], string> = {
  plant: "Time to plant",
  harvest: "Time to harvest",
  request_equipment: "Request equipment now",
  hold: "Hold — wait for better conditions",
};

export default function WeatherScreen() {
  const { user } = useAuth();
  const {
    data: recommendations,
    isLoading,
    refetch,
  } = useFetch<Paginated<PlantingRecommendation>>(
    user ? "/weather/recommendations/" : null,
    [user?.id]
  );

  const [crop, setCrop] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!crop.trim()) return;
    setError("");
    setIsGenerating(true);
    try {
      await apiClient.post("/weather/recommendations/generate/", { crop: crop.trim() });
      setCrop("");
      refetch();
    } catch {
      setError("Could not get guidance right now. Please try again in a moment.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weather Guidance</Text>
        <Text style={styles.subtitle}>
          AI-driven timing for planting, harvest, and equipment requests
        </Text>
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
            style={[styles.generateButton, (!crop.trim() || isGenerating) && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={!crop.trim() || isGenerating}
          >
            {isGenerating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.generateButtonText}>Ask</Text>}
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={recommendations?.results ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardCrop}>{item.crop}</Text>
            <Text style={styles.cardAction}>{ACTION_LABELS[item.recommended_action]}</Text>
            <Text style={styles.cardWindow}>
              {item.recommended_window_start} – {item.recommended_window_end}
            </Text>
            <Text style={styles.cardRationale}>{item.ai_rationale}</Text>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No weather guidance yet — ask above for your first crop.</Text>
            </View>
          ) : null
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
  generateButtonDisabled: { opacity: 0.5 },
  generateButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  error: { color: "#DC2626", fontSize: 12, marginTop: 8 },
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
  cardAction: { fontSize: 14, color: "#2F6B3C", fontWeight: "600", marginTop: 4 },
  cardWindow: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  cardRationale: { fontSize: 13, color: "#374151", marginTop: 8, lineHeight: 18 },
  empty: { paddingTop: 20, paddingHorizontal: 12 },
  emptyText: { textAlign: "center", color: "#9CA3AF", fontSize: 14, lineHeight: 20 },
});
