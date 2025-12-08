'use client';

import { useState } from 'react';
import { submitInterest } from '@/app/actions/interest';
import { Loader2 } from 'lucide-react';

interface InterestButtonProps {
  propertyId: string;
  isInterested?: boolean;
}

export function InterestButton({ propertyId, isInterested = false }: InterestButtonProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await submitInterest(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setShowForm(false);
    }
    setLoading(false);
  }

  if (isInterested || success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <h3 className="text-lg font-bold text-emerald-800">Interest Registered</h3>
        <p className="mt-2 text-sm text-emerald-600">
          The landlord has been notified of your interest.
        </p>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900">Interested?</h3>
        <p className="mt-2 text-sm text-slate-500">
          Express your interest to the landlord. You can also make an offer.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
        >
          I'm Interested / Make Offer
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-900">Express Interest</h3>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="propertyId" value={propertyId} />

        <div>
          <label htmlFor="offerAmount" className="block text-sm font-medium text-slate-700">
            Offer Amount (Optional)
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-slate-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              name="offerAmount"
              id="offerAmount"
              className="block w-full rounded-md border-gray-300 pl-7 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2 border px-3"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-slate-700">
            Message (Optional)
          </label>
          <textarea
            name="message"
            id="message"
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm border p-2"
            placeholder="Hi, I'd like to rent this place..."
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
