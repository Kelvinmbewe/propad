import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateUserTrustScore } from "./trust-score";

describe("calculateUserTrustScore", () => {
  it("caps score at 100", () => {
    const result = calculateUserTrustScore({
      kycStatus: "VERIFIED",
      docVerifiedCount: 3,
      docRequiredCount: 3,
      verifiedEmail: true,
      verifiedPhone: true,
      yearsActive: 20,
      verifiedTransactions: 200,
      avgRating: 5,
      reviewCount: 200,
      complaintResolutionRate: 1,
    });

    assert.equal(result.score, 100);
  });

  it("reduces score when kyc is rejected", () => {
    const verified = calculateUserTrustScore({
      kycStatus: "VERIFIED",
      docVerifiedCount: 2,
      docRequiredCount: 2,
      verifiedEmail: true,
      verifiedPhone: true,
      yearsActive: 2,
      verifiedTransactions: 5,
      avgRating: 4.5,
      reviewCount: 12,
      complaintResolutionRate: 0.9,
    });

    const rejected = calculateUserTrustScore({
      kycStatus: "REJECTED",
      docVerifiedCount: 0,
      docRequiredCount: 2,
      verifiedEmail: true,
      verifiedPhone: true,
      yearsActive: 2,
      verifiedTransactions: 5,
      avgRating: 4.5,
      reviewCount: 12,
      complaintResolutionRate: 0.9,
    });

    assert.ok(rejected.score < verified.score);
  });
});
