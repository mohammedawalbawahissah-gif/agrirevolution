import { Receipt } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import type { Paginated, Transaction } from "../../types";

const CHANNEL_LABELS: Record<string, string> = {
  mtn_momo: "MTN MoMo",
  vodafone_cash: "Vodafone Cash",
  airteltigo: "AirtelTigo Money",
  card: "Card",
};

export default function AdminTransactions() {
  const { data: transactions, isLoading } = useFetch<Paginated<Transaction>>("/payments/transactions/");

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-page-title">Transactions</h1>
        <p className="text-page-subtitle">Payment records — read-only ledger, no manual edits</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {transactions?.results.length ? (
          <div className="overflow-x-auto">
<table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Transaction</th>
                <th className="text-left px-5 py-3 font-medium">Purpose</th>
                <th className="text-left px-5 py-3 font-medium">Channel</th>
                <th className="text-left px-5 py-3 font-medium">Amount</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.results.map((t) => (
                <tr key={t.id}>
                  <td className="px-5 py-3 font-medium text-gray-900">#{t.id}</td>
                  <td className="px-5 py-3 text-gray-600 capitalize">{t.purpose.replace("_", " ")}</td>
                  <td className="px-5 py-3 text-gray-600">{CHANNEL_LABELS[t.channel] || t.channel}</td>
                  <td className="px-5 py-3 text-gray-600">GHS {t.amount_ghs}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        ) : !isLoading ? (
          <EmptyState
            icon={Receipt}
            title="No transactions yet"
            description="These populate once MoMo payments go live."
          />
        ) : (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>
        )}
      </div>
    </div>
  );
}
