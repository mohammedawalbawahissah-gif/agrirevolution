import { useState } from "react";
import { CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import type { Paginated, User, UserRole } from "../../types";

const ROLES: UserRole[] = ["farmer", "dealer", "buyer", "admin"];

export default function AdminUsers() {
  const { data: users, isLoading, refetch } = useFetch<Paginated<User>>("/accounts/users/");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function toggleVerified(u: User) {
    setBusyId(u.id);
    try {
      await apiClient.patch(`/accounts/users/${u.id}/`, { is_verified: !u.is_verified });
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(u: User, role: UserRole) {
    setBusyId(u.id);
    try {
      await apiClient.patch(`/accounts/users/${u.id}/`, { role });
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(u: User) {
    if (!confirm(`Delete ${u.username}? This cannot be undone.`)) return;
    setBusyId(u.id);
    try {
      await apiClient.delete(`/accounts/users/${u.id}/`);
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-gray-500 mt-1">Manage every account on the platform</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-3 font-medium">User</th>
              <th className="text-left px-5 py-3 font-medium">Phone</th>
              <th className="text-left px-5 py-3 font-medium">Role</th>
              <th className="text-left px-5 py-3 font-medium">Verified</th>
              <th className="text-left px-5 py-3 font-medium">Joined</th>
              <th className="text-right px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users?.results.map((u) => (
              <tr key={u.id} className={busyId === u.id ? "opacity-50" : ""}>
                <td className="px-5 py-3">
                  <p className="font-medium">
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
                    className="border border-gray-200 rounded-md px-2 py-1 text-sm capitalize"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => toggleVerified(u)}
                    disabled={busyId === u.id}
                    className="flex items-center gap-1.5 text-xs font-medium"
                  >
                    {u.is_verified ? (
                      <>
                        <CheckCircle2 size={16} className="text-brand-green" /> Verified
                      </>
                    ) : (
                      <>
                        <XCircle size={16} className="text-gray-400" /> Unverified
                      </>
                    )}
                  </button>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => deleteUser(u)}
                    disabled={busyId === u.id}
                    className="text-gray-400 hover:text-red-600"
                    title="Delete user"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && users?.results.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No users yet.</p>
        )}
        {isLoading && <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>}
      </div>
    </div>
  );
}
