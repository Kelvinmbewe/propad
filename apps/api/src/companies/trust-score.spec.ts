import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateTrustScore } from "./trust-score";

describe("calculateTrustScore", () => {
  it("caps score at 100", () => {
    const result = calculateTrustScore({
      kycStatus: "VERIFIED",
      docVerifiedCount: 5,
      docRequiredCount: 5,
      verifiedEmail: true,
      verifiedPhone: true,
      yearsActive: 20,
      verifiedTransactions: 500,
      avgRating: 5,
      reviewCount: 300,
      complaintResolutionRate: 1,
    });

    assert.equal(result.score, 100);
  });

  it("returns lower score for rejected KYC", () => {
    const verified = calculateTrustScore({
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

    const rejected = calculateTrustScore({
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
