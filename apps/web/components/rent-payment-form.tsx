'use client';

import { useState } from 'react';
import { logRentPayment } from '@/app/actions/rent';

export function RentPaymentForm({ properties }: { properties: { id: string; title: string }[] }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    await logRentPayment(formData);
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="rounded-lg bg-green-50 p-4 text-green-700">
        Payment logged successfully! Pending verification.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 p-6 bg-white">
      <h3 className="font-semibold text-slate-900">Log Rent Payment</h3>

      <div>
        <label className="block text-sm font-medium text-slate-700">Property</label>
        <select name="propertyId" className="mt-1 block w-full rounded-md border-gray-300 py-2 border px-3">
          {properties.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Amount</label>
          <input type="number" name="amount" step="0.01" required className="mt-1 block w-full rounded-md border-gray-300 py-2 border px-3" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Currency</label>
          <select name="currency" className="mt-1 block w-full rounded-md border-gray-300 py-2 border px-3">
            <option value="USD">USD</option>
            <option value="ZWG">ZWG</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Date Paid</label>
        <input type="date" name="paidAt" required className="mt-1 block w-full rounded-md border-gray-300 py-2 border px-3" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Proof URL (Optional)</label>
        <input type="url" name="proofUrl" placeholder="https://..." className="mt-1 block w-full rounded-md border-gray-300 py-2 border px-3" />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? 'Logging...' : 'Log Payment'}
      </button>
    </form>
  );
}
