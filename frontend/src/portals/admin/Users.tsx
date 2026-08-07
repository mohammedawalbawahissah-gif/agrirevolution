import { useState } from "react";
import { Ban, RotateCcw, ShieldCheck, ShieldOff, Trash2, Users as UsersIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import EmptyState from "../../components/ui/EmptyState";
import type { Paginated, User, UserRole } from "../../types";

const ROLES: UserRole[] = ["farmer", "dealer", "buyer", "admin"];

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading, refetch } = useFetch<Paginated<User>>("/accounts/users/");
  const [busyId, setBusyId] = useState<number | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  async function toggleVerified(u: User) {
    setBusyId(u.id);
    try {
      await apiClient.patch(`/accounts/users/${u.id}/`, { is_verified: !u.is_verified });
      toast.success(u.is_verified ? `${u.username} marked unverified` : `${u.username} verified`);
      refetch();
    } catch {
      toast.error("Couldn't update verification status.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleSuspended(u: User) {
    const suspending = u.is_active;
    if (suspending) {
      const ok = await confirm({
        title: `Suspend ${u.username}?`,
        description: "They won't be able to sign in until you reactivate the account. Their data is kept.",
        confirmLabel: "Suspend",
        tone: "danger",
      });
      if (!ok) return;
    }
    setBusyId(u.id);
    try {
      await apiClient.patch(`/accounts/users/${u.id}/`, { is_active: !u.is_active });
      toast.success(suspending ? `${u.username} suspended` : `${u.username} reactivated`);
      refetch();
    } catch {
      toast.error("Couldn't update account status.");
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(u: User, role: UserRole) {
    setBusyId(u.id);
    try {
      await apiClient.patch(`/accounts/users/${u.id}/`, { role });
      toast.success(`${u.username} is now a ${role}`);
      refetch();
    } catch {
      toast.error("Couldn't change role.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(u: User) {
    const ok = await confirm({
      title: `Delete ${u.username}?`,
      description: "This permanently removes their account and cannot be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    setBusyId(u.id);
    try {
      await apiClient.delete(`/accounts/users/${u.id}/`);
      toast.success(`${u.username} deleted`);
      refetch();
    } catch {
      toast.error("Couldn't delete user.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-page-title">Users</h1>
        <p className="text-page-subtitle">Manage every account on the platform</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {users?.results.length ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-3 font-medium">User</th>
                <th className="text-left px-5 py-3 font-medium">Phone</th>
                <th className="text-left px-5 py-3 font-medium">Role</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Joined</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.results.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className={busyId === u.id ? "opacity-50" : ""}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="text-gray-400 text-xs">@{u.username}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{u.phone_number || "—"}</td>
                    <td className="px-5 py-3">
                      <select
                        value={u.role}
                        disabled={busyId === u.id}
                        onChange={(e) => changeRole(u, e.target.value as UserRole)}
                        className="border border-gray-200 rounded-md px-2 py-1 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-brand-green"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 space-y-1">
                      <p className={`flex items-center gap-1.5 text-xs font-medium ${u.is_verified ? "text-status-success" : "text-gray-400"}`}>
                        {u.is_verified ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                        {u.is_verified ? "Verified" : "Unverified"}
                      </p>
                      {!u.is_active && (
                        <p className="flex items-center gap-1.5 text-xs font-medium text-status-danger">
                          <Ban size={14} />
                          Suspended
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => toggleVerified(u)}
                          disabled={busyId === u.id}
                          className={`text-xs font-medium hover:underline disabled:opacity-50 ${
                            u.is_verified ? "text-gray-500" : "text-brand-green"
                          }`}
                        >
                          {u.is_verified ? "Unverify" : "Verify"}
                        </button>
                        <button
                          onClick={() => toggleSuspended(u)}
                          disabled={busyId === u.id || isSelf}
                          title={isSelf ? "You can't suspend your own account" : undefined}
                          className="text-gray-400 hover:text-status-warning transition-colors disabled:opacity-30 disabled:hover:text-gray-400"
                        >
                          {u.is_active ? <Ban size={16} /> : <RotateCcw size={16} />}
                        </button>
                        <button
                          onClick={() => deleteUser(u)}
                          disabled={busyId === u.id || isSelf}
                          title={isSelf ? "You can't delete your own account" : "Delete user"}
                          className="text-gray-400 hover:text-status-danger transition-colors disabled:opacity-30 disabled:hover:text-gray-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : !isLoading ? (
          <EmptyState icon={UsersIcon} title="No users yet" description="Accounts will appear here as people register." />
        ) : (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>
        )}
      </div>
    </div>
  );
}
