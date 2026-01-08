import { Star } from 'lucide-react';
import { ReviewForm } from '@/components/reviews/review-form';
import { serverPublicApiRequest } from '@/lib/server-api';

interface ReviewWithReviewer {
  id: string;
  rating: number;
  weight: number;
  type: string;
  comment: string | null;
  createdAt: string;
  reviewer: { name: string | null };
}

async function getUserReviews(userId: string): Promise<{ reviews: ReviewWithReviewer[]; averageRating: number; count: number }> {
  try {
    // TODO: Implement API endpoint
    // const data = await serverPublicApiRequest<any>(`/users/${userId}/reviews`);
    // return { reviews: data.reviews, averageRating: data.averageRating, count: data.count };
    console.warn('[user-profile-reviews.tsx] getUserReviews - API endpoint not yet implemented');
    return { reviews: [], averageRating: 0, count: 0 };
  } catch (error) {
    console.error('Failed to fetch user reviews:', error);
    return { reviews: [], averageRating: 0, count: 0 };
  }
}

export async function UserProfileReviews({ userId }: { userId: string }) {
  const { reviews, averageRating, count } = await getUserReviews(userId);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
          <span className="text-3xl font-bold text-slate-900">{averageRating.toFixed(1)}</span>
        </div>
        <div className="text-sm text-slate-500">
          based on {count} reviews (Weighted)
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">
                  {review.type === 'ANONYMOUS' ? 'Anonymous' : review.reviewer.name}
                </span>
                <span className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="mt-1 flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-slate-300'}`} />
                ))}
              </div>
              <p className="mt-2 text-sm text-slate-600">{review.comment}</p>
              <span className="mt-2 inline-block rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                {review.type.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>

        <div>
          <ReviewForm revieweeId={userId} />
        </div>
      </div>
    </div>
  );
}
