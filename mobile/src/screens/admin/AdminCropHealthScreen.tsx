import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import DetailModal from "../../components/ui/DetailModal";
import { colors, radius } from "../../theme/tokens";
import type { DiseaseReport, Paginated } from "../../types";

const SEVERITY_FILTERS: { value: DiseaseReport["severity"] | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "severe", label: "Severe" },
  { value: "moderate", label: "Moderate" },
  { value: "mild", label: "Mild" },
  { value: "healthy", label: "Healthy" },
  { value: "unknown", label: "Unclear" },
];

/**
 * Early-warning view across every farmer's crop-health checks, mirroring
 * web's admin CropHealth.tsx. Filterable by severity so a moderate/severe
 * pattern across several farmers is visible at a glance.
 */
export default function AdminCropHealthScreen() {
  const [severityFilter, setSeverityFilter] = useState<DiseaseReport["severity"] | "all">("all");
  const { data: reports, isLoading, refetch } = useFetch<Paginated<DiseaseReport>>(
    severityFilter === "all" ? "/cropcare/reports/" : `/cropcare/reports/?severity=${severityFilter}`,
    [severityFilter]
  );
  const [openReportId, setOpenReportId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  const openReport = reports?.results.find((r) => r.id === openReportId) ?? null;

  function openModal(report: DiseaseReport) {
    setOpenReportId(report.id);
    setNotesDraft(report.admin_notes ?? "");
  }

  async function saveNotes() {
    if (!openReport) return;
    setIsSaving(true);
    try {
      await apiClient.patch(`/cropcare/reports/${openReport.id}/`, { admin_notes: notesDraft });
      toast.success("Notes saved");
      refetch();
    } catch {
      toast.error("Couldn't save notes.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Crop Health</Text>
        <Text style={styles.subtitle}>Disease/pest checks farmers have submitted, across every farm</Text>
      </View>

      <View style={styles.filterRow}>
        {SEVERITY_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setSeverityFilter(f.value)}
            style={[styles.filterChip, severityFilter === f.value && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, severityFilter === f.value && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={reports?.results ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => openModal(item)}>
            <Image source={{ uri: item.photo_url }} style={styles.rowThumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.crop} — {item.diagnosis || "Checking…"}
              </Text>
              <Text style={styles.rowSubtitle}>{item.farmer_name}</Text>
            </View>
            <StatusBadge status={item.severity} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nothing matches this filter yet.</Text>
            </View>
          ) : null
        }
      />

      <DetailModal
        isOpen={openReport !== null}
        onClose={() => setOpenReportId(null)}
        title={openReport ? `${openReport.crop} — ${openReport.farmer_name}` : ""}
        status={openReport?.severity}
        fields={
          openReport
            ? [
                { label: "Diagnosis", value: openReport.diagnosis || "—" },
                { label: "Symptoms observed", value: openReport.symptoms_observed || "—" },
                { label: "Recommended action", value: openReport.recommended_action || "—" },
                { label: "Source", value: openReport.source === "ai" ? "AI Diagnosis" : "Manual" },
                { label: "Submitted", value: new Date(openReport.created_at).toLocaleString() },
              ]
            : []
        }
      >
        {openReport && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Admin notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notesDraft}
              onChangeText={setNotesDraft}
              placeholder="e.g. Extension officer dispatched, follow-up scheduled…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveNotes} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>Save Notes</Text>}
            </TouchableOpacity>
          </View>
        )}
      </DetailModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brandCream },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  filterChipActive: { backgroundColor: colors.brandGreen, borderColor: colors.brandGreen },
  filterChipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  filterChipTextActive: { color: "#fff" },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowThumb: { width: 44, height: 44, borderRadius: radius.sm },
  rowTitle: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  rowSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  empty: { paddingTop: 40, paddingHorizontal: 20 },
  emptyText: { textAlign: "center", color: colors.textMuted, fontSize: 14 },
  notesSection: { paddingHorizontal: 20, paddingBottom: 20 },
  notesLabel: { fontSize: 13, fontWeight: "600", color: colors.textPrimary, marginBottom: 6 },
  notesInput: {
    backgroundColor: colors.brandCream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
    textAlignVertical: "top",
    minHeight: 70,
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: colors.brandGreen,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});
