import { useFetch } from "../../hooks/useFetch";
import type { Paginated, Transaction } from "../../types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  success: "bg-green-50 text-brand-green",
  failed: "bg-red-50 text-red-700",
};

const CHANNEL_LABELS: Record<string, string> = {
  mtn_momo: "MTN MoMo",
  vodafone_cash: "Vodafone Cash",
  airteltigo: "AirtelTigo Money",
  card: "Card",
};

export default function AdminTransactions() {
  const { data: transactions, isLoading } = useFetch<Paginated<Transaction>>("/payments/transactions/");

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-sm text-gray-500 mt-1">Payment records — read-only ledger, no manual edits</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
            {transactions?.results.map((t) => (
              <tr key={t.id}>
                <td className="px-5 py-3 font-medium">#{t.id}</td>
                <td className="px-5 py-3 text-gray-600 capitalize">{t.purpose.replace("_", " ")}</td>
                <td className="px-5 py-3 text-gray-600">{CHANNEL_LABELS[t.channel] || t.channel}</td>
                <td className="px-5 py-3 text-gray-600">GHS {t.amount_ghs}</td>
                <td className="px-5 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${STATUS_STYLES[t.status]}`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && transactions?.results.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            No transactions yet — these populate once MoMo payments go live.
          </p>
        )}
        {isLoading && <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>}
      </div>
    </div>
  );
}
