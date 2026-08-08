import { useState } from "react";
import { Leaf } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import DetailModal from "../../components/ui/DetailModal";
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
 * Early-warning view across every farmer's crop-health checks — sorted by
 * recency (backend default), filterable by severity so a moderate/severe
 * outbreak pattern across several farmers is visible at a glance rather
 * than buried in a long list.
 */
export default function AdminCropHealth() {
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
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-page-title">Crop Health</h1>
        <p className="text-page-subtitle">Disease/pest checks farmers have submitted, across every farm</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {SEVERITY_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setSeverityFilter(f.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              severityFilter === f.value
                ? "bg-brand-green text-white border-brand-green"
                : "bg-white text-gray-600 border-gray-200 hover:border-brand-green"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {reports?.results.length ? (
          <div className="divide-y divide-gray-100">
            {reports.results.map((r) => (
              <button
                key={r.id}
                onClick={() => openModal(r)}
                className="w-full text-left px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors"
              >
                <img src={r.photo_url} className="w-10 h-10 object-cover rounded shrink-0" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">
                    {r.crop} — {r.diagnosis || "Checking…"}
                  </p>
                  <p className="text-xs text-gray-400">{r.farmer_name}</p>
                </div>
                <StatusBadge status={r.severity} />
              </button>
            ))}
          </div>
        ) : !isLoading ? (
          <EmptyState icon={Leaf} title="No reports" description="Nothing matches this filter yet." />
        ) : (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>
        )}
      </div>

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
          <div className="px-5 pb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin notes</label>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="e.g. Extension officer dispatched, follow-up scheduled…"
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <button
              onClick={saveNotes}
              disabled={isSaving}
              className="mt-2 bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save Notes"}
            </button>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
