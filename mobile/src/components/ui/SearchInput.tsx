import { View, TextInput, TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors, radius } from "../../theme/tokens";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Consistent search box for list screens — the mobile counterpart of web's
 * SearchInput. Pair with a filtered slice of the fetched list. */
export default function SearchInput({ value, onChange, placeholder = "Search…" }: SearchInputProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChange("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.clear}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  icon: { fontSize: 13, marginRight: 8, opacity: 0.5 },
  input: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.textPrimary },
  clear: { fontSize: 13, color: colors.textMuted, paddingLeft: 8 },
});
