import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, type ViewStyle } from "react-native";
import { colors, radius } from "../../theme/tokens";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Shared button used across mobile screens so primary/secondary/danger/ghost
 * actions look the same everywhere, matching the web frontend's Button.
 */
export default function Button({
  title,
  onPress,
  variant = "primary",
  isLoading,
  disabled,
  style,
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, VARIANT_STYLES[variant], isDisabled && styles.disabled, style]}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? colors.brandGreen : "#fff"} />
      ) : (
        <Text style={[styles.text, TEXT_STYLES[variant]]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  text: { fontWeight: "600", fontSize: 15 },
});

const VARIANT_STYLES: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.brandGreen },
  secondary: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.statusDanger },
  ghost: { backgroundColor: "transparent" },
};

const TEXT_STYLES: Record<Variant, { color: string }> = {
  primary: { color: "#fff" },
  secondary: { color: colors.textPrimary },
  danger: { color: "#fff" },
  ghost: { color: colors.brandGreen },
};
