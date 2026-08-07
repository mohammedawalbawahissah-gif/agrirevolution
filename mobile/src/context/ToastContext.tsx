import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../theme/tokens";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const KIND_COLOR: Record<ToastKind, string> = {
  success: colors.statusSuccess,
  error: colors.statusDanger,
  info: colors.statusInfo,
};

const AUTO_DISMISS_MS = 3500;

/**
 * App-wide toast notifications, mounted once in App.tsx. Mirrors the web
 * frontend's ToastProvider so both apps confirm actions and surface errors
 * the same way instead of failing silently.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((t) => [...t, { id, kind, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const value: ToastContextValue = {
    success: (message) => push("success", message),
    error: (message) => push("error", message),
    info: (message) => push("info", message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <SafeAreaView style={styles.overlay} pointerEvents="none">
        {toasts.map((toast) => (
          <View key={toast.id} style={styles.toast}>
            <View style={[styles.dot, { backgroundColor: KIND_COLOR[toast.kind] }]} />
            <Text style={styles.message}>{toast.message}</Text>
          </View>
        ))}
      </SafeAreaView>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 8,
    gap: 8,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  message: { fontSize: 13, color: colors.textPrimary, flexShrink: 1 },
});
