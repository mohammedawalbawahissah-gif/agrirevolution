import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import { colors, radius } from "../../theme/tokens";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigation = useNavigation<any>();

  async function handleLogin() {
    setError("");
    setIsSubmitting(true);
    try {
      await login(username, password);
      // Navigation to the tab stack happens automatically once `user` is set —
      // RootNavigator watches auth state and swaps stacks.
    } catch {
      setError("Invalid username or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeEmoji}>🌱</Text>
        </View>
        <Text style={styles.title}>AgriRevolution</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Sign In" onPress={handleLogin} isLoading={isSubmitting} style={styles.button} />

        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.link}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brandCream },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brandGreenLight,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  badgeEmoji: { fontSize: 22 },
  title: { fontSize: 26, fontWeight: "700", color: colors.textPrimary, textAlign: "center", letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginTop: 4, marginBottom: 24 },
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
