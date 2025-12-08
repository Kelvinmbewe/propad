'use client';

import { useState } from 'react';
import { submitReview } from '@/app/actions/reviews';
import { Star, Loader2 } from 'lucide-react';

interface ReviewFormProps {
  revieweeId: string;
}

export function ReviewForm({ revieweeId }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    formData.set('rating', rating.toString());

    await submitReview(formData);
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="rounded-lg bg-green-50 p-4 text-green-700">
        Thank you for your review!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 p-6 bg-white">
      <h3 className="font-semibold text-slate-900">Write a Review</h3>
      <input type="hidden" name="revieweeId" value={revieweeId} />

      <div>
        <label className="block text-sm font-medium text-slate-700">Rating</label>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="focus:outline-none"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
            >
              <Star
                className={`h-6 w-6 ${
                  star <= (hoverRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-slate-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Relationship</label>
        <select
          name="type"
          className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm border"
        >
          <option value="EXTERNAL">Acquaintance / Other</option>
          <option value="PREVIOUS_TENANT">Previous Tenant (High Trust)</option>
          <option value="NEIGHBOR">Neighbor</option>
          <option value="ANONYMOUS">Anonymous</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Comment</label>
        <textarea
          name="comment"
          rows={3}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm border p-2"
        />
      </div>

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Submit Review'}
      </button>
    </form>
  );
}
