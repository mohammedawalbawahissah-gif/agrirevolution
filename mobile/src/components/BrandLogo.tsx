import { Image, View, Text, StyleSheet, type StyleProp, type ImageStyle } from "react-native";
import { colors } from "../theme/tokens";

/**
 * The AgriRevolution app icon (sun rising over furrows, sprout at the
 * vanishing point) as an in-app brand mark. Same artwork as the launcher
 * icon and the web favicon/sidebar logo, so every screen shows one mark.
 * Corner radius matches the tile's built-in 22.5% rounding.
 */
export default function BrandLogo({ size = 40, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={require("../../assets/logo.png")}
      style={[{ width: size, height: size, borderRadius: size * 0.225 }, style]}
      accessibilityLabel="AgriRevolution"
    />
  );
}

/** Logo + wordmark, used as the shared native header title on every tab. */
export function BrandHeaderTitle() {
  return (
    <View style={styles.row}>
      <BrandLogo size={26} />
      <Text style={styles.word} numberOfLines={1}>AgriRevolution</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  word: { fontSize: 17, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.2 },
});
