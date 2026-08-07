import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "../components/ui/Button";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

/**
 * App-wide confirm dialog. Mounted once in App.tsx; any page calls
 * useConfirm() and awaits the result instead of the browser's native
 * confirm(), which can't be styled and reads as unpolished mid-flow.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  function close(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-start gap-3">
              {pending.tone === "danger" && (
                <div className="w-9 h-9 rounded-full bg-status-danger-bg flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} className="text-status-danger" />
                </div>
              )}
              <div>
                <h2 className="text-sm font-semibold text-gray-900">{pending.title}</h2>
                {pending.description && (
                  <p className="text-sm text-gray-500 mt-1">{pending.description}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" size="sm" onClick={() => close(false)}>
                {pending.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                variant={pending.tone === "danger" ? "danger" : "primary"}
                size="sm"
                onClick={() => close(true)}
              >
                {pending.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}
