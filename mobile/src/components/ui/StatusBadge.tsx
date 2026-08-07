import { View, Text, StyleSheet } from "react-native";
import { statusTone, toneColors } from "../../theme/tokens";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  status: string;
  tone?: Tone;
}

/**
 * Renders any status string as a consistent colored pill. Pass `tone` to
 * override the automatic mapping for a status not in the shared table.
 */
export default function StatusBadge({ status, tone }: StatusBadgeProps) {
  const resolvedTone = tone ?? statusTone[status.toLowerCase()] ?? "neutral";
  const { fg, bg } = toneColors(resolvedTone);
  const label = status.replace(/_/g, " ");

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
});
