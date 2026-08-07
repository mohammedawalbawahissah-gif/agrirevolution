import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types";
import Button from "../../components/ui/Button";
import { colors, radius } from "../../theme/tokens";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "farmer", label: "Farmer" },
  { value: "dealer", label: "Equipment Dealer" },
  { value: "buyer", label: "Buyer" },
];

export default function RegisterScreen() {
  const [form, setForm] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    role: "farmer" as UserRole,
    community: "",
    district: "Tamale Metro",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigation = useNavigation<any>();

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateRole(role: UserRole) {
    setForm((f) => ({ ...f, role }));
  }

  async function handleRegister() {
    setError("");
    setIsSubmitting(true);
    try {
      await register(form);
      navigation.navigate("Login");
    } catch (err: any) {
      const data = err?.response?.data;
      setError(data ? Object.values(data).flat().join(" ") : "Registration failed. Please check your details.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Join AgriRevolution</Text>

      <Text style={styles.label}>I am a...</Text>
      <View style={styles.roleRow}>
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[styles.roleChip, form.role === r.value && styles.roleChipActive]}
            onPress={() => updateRole(r.value)}
          >
            <Text style={[styles.roleChipText, form.role === r.value && styles.roleChipTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="First name"
          value={form.first_name}
          onChangeText={(v) => update("first_name", v)}
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Last name"
          value={form.last_name}
          onChangeText={(v) => update("last_name", v)}
        />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Username"
        autoCapitalize="none"
        value={form.username}
        onChangeText={(v) => update("username", v)}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone number"
        keyboardType="phone-pad"
        value={form.phone_number}
        onChangeText={(v) => update("phone_number", v)}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={form.password}
        onChangeText={(v) => update("password", v)}
      />
      <TextInput
        style={styles.input}
        placeholder="Community"
        value={form.community}
        onChangeText={(v) => update("community", v)}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Create Account" onPress={handleRegister} isLoading={isSubmitting} style={styles.button} />

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brandCream },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 24 },
  row: { flexDirection: "row", gap: 8 },
  halfInput: { flex: 1 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  roleRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  roleChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: "center",
  },
  roleChipActive: { backgroundColor: colors.brandGreen, borderColor: colors.brandGreen },
  roleChipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  roleChipTextActive: { color: "#fff" },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  error: { color: colors.statusDanger, fontSize: 13, marginBottom: 8 },
  button: { marginTop: 8 },
  link: { color: colors.brandGreen, textAlign: "center", marginTop: 16, fontSize: 13, fontWeight: "500" },
});
