import { View, Text, StyleSheet } from "react-native";

export default function WeatherScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weather</Text>
      <Text style={styles.subtitle}>Screen scaffold — build out Weather flow here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666" },
});
