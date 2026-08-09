import type { ReactNode } from "react";
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, ActivityIndicator } from "react-native";
import StatusBadge from "./StatusBadge";
import { colors, radius } from "../../theme/tokens";

export interface DetailField {
  label: string;
  value: string;
}

export interface DetailAction {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
}

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  status?: string;
  fields: DetailField[];
  actions?: DetailAction[];
  isBusy?: boolean;
  /** Extra content between the fields list and the actions row. */
  children?: ReactNode;
}

/**
 * Tap-a-row-to-open detail sheet — the mobile counterpart of the web
 * DetailModal, same API shape (status/fields/actions/isBusy/children) so a
 * page reads the same way on both platforms. Replaces the old
 * tap-to-cycle-status pattern with real, labeled actions in one place.
 */
export default function DetailModal({ isOpen, onClose, title, status, fields, actions, isBusy, children }: DetailModalProps) {
  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, isBusy && styles.sheetBusy]} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {status && <StatusBadge status={status} />}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fields}>
            {fields.map((f) => (
              <View key={f.label} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <Text style={styles.fieldValue} numberOfLines={3}>
                  {f.value}
                </Text>
              </View>
            ))}
          </View>

          {children}

          {actions && actions.length > 0 && (
            <View style={styles.actions}>
              {actions.map((a) => (
                <TouchableOpacity
                  key={a.label}
                  onPress={a.onPress}
                  disabled={a.disabled || isBusy}
                  style={[styles.actionBtn, ACTION_STYLES[a.variant ?? "secondary"]]}
                >
                  {isBusy ? (
                    <ActivityIndicator size="small" color={a.variant === "secondary" || a.variant === "ghost" ? colors.brandGreen : "#fff"} />
                  ) : (
                    <Text style={[styles.actionText, ACTION_TEXT_STYLES[a.variant ?? "secondary"]]}>{a.label}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: "85%" },
  sheetBusy: { opacity: 0.7 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, marginRight: 12 },
  title: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, flexShrink: 1 },
  close: { fontSize: 16, color: colors.textMuted },
  fields: { paddingHorizontal: 20, paddingVertical: 16, gap: 10 },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  fieldLabel: { fontSize: 13, color: colors.textSecondary },
  fieldValue: { fontSize: 13, color: colors.textPrimary, fontWeight: "500", flexShrink: 1, textAlign: "right" },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.sm, minWidth: 90, alignItems: "center" },
  actionText: { fontSize: 13, fontWeight: "600" },
});

const ACTION_STYLES = {
  primary: { backgroundColor: colors.brandGreen },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.statusDanger },
  ghost: { backgroundColor: "transparent" },
} as const;

const ACTION_TEXT_STYLES = {
  primary: { color: "#fff" },
  secondary: { color: colors.textPrimary },
  danger: { color: "#fff" },
  ghost: { color: colors.brandGreen },
} as const;
