import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useFetch } from "../hooks/useFetch";
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
    user ? `/weather/recommendations/?farmer=${user.id}` : null,
    [user?.id]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weather Guidance</Text>
        <Text style={styles.subtitle}>
          AI-driven timing for planting, harvest, and equipment requests
        </Text>
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
              <Text style={styles.emptyText}>
                No weather guidance yet. Recommendations appear here once available for your
                community and crops.
              </Text>
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
  empty: { paddingTop: 60, paddingHorizontal: 12 },
  emptyText: { textAlign: "center", color: "#9CA3AF", fontSize: 14, lineHeight: 20 },
});
