export interface UserTrustScoreInput {
  kycStatus: "VERIFIED" | "PENDING" | "REJECTED";
  docVerifiedCount: number;
  docRequiredCount: number;
  verifiedEmail: boolean;
  verifiedPhone: boolean;
  yearsActive: number;
  verifiedTransactions: number;
  avgRating: number;
  reviewCount: number;
  complaintResolutionRate: number;
}

export interface UserTrustScoreBreakdown {
  kyc: number;
  documents: number;
  identity: number;
  tenure: number;
  transactions: number;
  reviews: number;
  complaints: number;
}

export function calculateUserTrustScore(input: UserTrustScoreInput) {
  const kycScore =
    input.kycStatus === "VERIFIED"
      ? 35
      : input.kycStatus === "PENDING"
        ? 18
        : 0;

  const docRatio =
    input.docRequiredCount > 0
      ? Math.min(input.docVerifiedCount / input.docRequiredCount, 1)
      : 0;
  const documentsScore = Math.round(docRatio * 15);

  const identityScore =
    (input.verifiedEmail ? 5 : 0) + (input.verifiedPhone ? 5 : 0);

  const tenureScore = Math.min(Math.max(input.yearsActive, 0), 10) * 2;

  const transactionScore = Math.round(
    (Math.min(input.verifiedTransactions, 50) / 50) * 10,
  );

  const reviewsScore =
    input.reviewCount > 0
      ? Math.round((Math.min(Math.max(input.avgRating, 0), 5) / 5) * 15)
      : 0;

  const complaintsScore = Math.round(
    Math.min(Math.max(input.complaintResolutionRate, 0), 1) * 10,
  );

  const breakdown: UserTrustScoreBreakdown = {
    kyc: kycScore,
    documents: documentsScore,
    identity: identityScore,
    tenure: tenureScore,
    transactions: transactionScore,
    reviews: reviewsScore,
    complaints: complaintsScore,
  };

  const rawScore = Object.values(breakdown).reduce(
    (sum, value) => sum + value,
    0,
  );
  const score = Math.min(rawScore, 100);

  return {
    score,
    breakdown,
    explanation: {
      kyc: input.kycStatus,
      documents: `${input.docVerifiedCount}/${input.docRequiredCount} verified`,
      identity: {
        email: input.verifiedEmail,
        phone: input.verifiedPhone,
      },
      tenureYears: input.yearsActive,
      verifiedTransactions: input.verifiedTransactions,
      avgRating: input.avgRating,
      reviewCount: input.reviewCount,
      complaintResolutionRate: input.complaintResolutionRate,
    },
  };
}
