import { View, Text, StyleSheet } from "react-native";

export default function MarketplaceScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Marketplace</Text>
      <Text style={styles.subtitle}>Screen scaffold — build out Marketplace flow here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666" },
});
