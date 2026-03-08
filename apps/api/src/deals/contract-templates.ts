type TemplateContext = {
  deal: any;
  property: any;
  applicant: any;
  manager: any;
};

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dateLabel(value?: Date | string | null) {
  if (!value) return "-";
  const parsed = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-ZW");
}

function money(value: unknown, currency = "USD") {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "-";
  return `${currency} ${amount.toFixed(2)}`;
}

export function renderDealContractTemplate(
  templateKey: "ZW_RENT_V2" | "ZW_SALE_V2",
  ctx: TemplateContext,
) {
  const { deal, property, applicant, manager } = ctx;
  const managerName = escapeHtml(manager?.name ?? manager?.email ?? "Manager");
  const applicantName = escapeHtml(
    applicant?.name ?? applicant?.email ?? "Applicant",
  );
  const propertyTitle = escapeHtml(property?.title ?? "Property");
  const propertyLocation = escapeHtml(
    property?.address ?? property?.description ?? "Zimbabwe",
  );
  const currency = deal?.currency ?? "USD";

  if (templateKey === "ZW_RENT_V2") {
    const monthlyRent =
      deal?.termsRent?.rentAmount ?? deal?.rentAmount ?? deal?.property?.price;
    const deposit = deal?.termsRent?.depositAmount ?? deal?.depositAmount;
    const leaseStart = deal?.termsRent?.leaseStartDate ?? deal?.startDate;
    const leaseEnd = deal?.termsRent?.leaseEndDate ?? deal?.endDate;
    const rules = escapeHtml(
      deal?.rules ??
        deal?.termsRent?.additionalTerms ??
        [
          "- No illegal activity on the premises.",
          "- Respect neighbors and keep reasonable noise levels.",
          "- No structural changes without written approval.",
          "- Report leaks/defects promptly to prevent damage.",
        ].join("\n"),
    );
    const specialTerms = escapeHtml(deal?.specialTerms ?? "");

    return `
      <section>
        <h1 style="margin:0 0 6px 0;">LEASE AGREEMENT (ZIMBABWE)</h1>
        <p style="margin:0;color:#475569;"><strong>Date:</strong> ${new Date().toLocaleDateString("en-ZW")}</p>
      </section>
      <hr />
      <section>
        <h2>1. Parties</h2>
        <p><strong>Landlord/Manager:</strong> ${managerName}</p>
        <p><strong>Tenant:</strong> ${applicantName}</p>
      </section>
      <section>
        <h2>2. Premises</h2>
        <p><strong>Property:</strong> ${propertyTitle}</p>
        <p><strong>Location:</strong> ${propertyLocation}</p>
      </section>
      <section>
        <h2>3. Term</h2>
        <p><strong>Commencement Date:</strong> ${dateLabel(leaseStart)}</p>
        <p><strong>End Date:</strong> ${dateLabel(leaseEnd)}</p>
      </section>
      <section>
        <h2>4. Rent and Payment</h2>
        <p><strong>Monthly Rent:</strong> ${money(monthlyRent, currency)}</p>
        <p><strong>Payment Due:</strong> On or before the agreed day of each month.</p>
      </section>
      <section>
        <h2>5. Security Deposit</h2>
        <p><strong>Deposit:</strong> ${money(deposit, currency)}</p>
      </section>
      <section>
        <h2>6. Utilities and Services</h2>
        <p>Utility responsibilities are as agreed by both parties and recorded in Special Terms.</p>
      </section>
      <section>
        <h2>7. Use and Occupancy</h2>
        <p>Premises shall be used lawfully and in line with the listing intent and agreed occupancy terms.</p>
      </section>
      <section>
        <h2>8. Maintenance and Repairs</h2>
        <p>Tenant keeps the premises in reasonable condition and reports defects promptly.</p>
      </section>
      <section>
        <h2>9. House Rules</h2>
        <div style="white-space:pre-wrap;border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#f8fafc;">${rules}</div>
      </section>
      <section>
        <h2>10. Special Terms</h2>
        <div style="white-space:pre-wrap;border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#fff;">${specialTerms || "-"}</div>
      </section>
      <section>
        <h2>11. Default and Termination</h2>
        <p>Material breach may lead to lawful remedies and termination subject to applicable Zimbabwean law.</p>
      </section>
      <section>
        <h2>12. Dispute Resolution</h2>
        <p>Parties shall attempt good-faith resolution before referral to mediation, arbitration, or competent courts.</p>
      </section>
      <section>
        <h2>13. Entire Agreement</h2>
        <p>This contract and addenda represent the complete agreement between the parties.</p>
      </section>
      <section>
        <h2>14. Electronic Signatures</h2>
        <p>Electronic signatures captured in PropAd are accepted by both parties.</p>
      </section>
    `;
  }

  const salePrice = deal?.termsSale?.salePrice ?? deal?.rentAmount;
  const transferDate = deal?.termsSale?.closingDate ?? deal?.startDate;
  const saleConditions = escapeHtml(
    deal?.specialTerms ??
      deal?.termsSale?.additionalTerms ??
      [
        "- Title and ownership documents to be provided by seller.",
        "- Buyer completes due diligence within agreed timelines.",
        "- Rates clearance and transfer steps handled by appointed conveyancer.",
      ].join("\n"),
  );

  return `
    <section>
      <h1 style="margin:0 0 6px 0;">AGREEMENT OF SALE (ZIMBABWE)</h1>
      <p style="margin:0;color:#475569;"><strong>Date:</strong> ${new Date().toLocaleDateString("en-ZW")}</p>
    </section>
    <hr />
    <section>
      <h2>1. Parties</h2>
      <p><strong>Seller/Agent:</strong> ${managerName}</p>
      <p><strong>Buyer:</strong> ${applicantName}</p>
    </section>
    <section>
      <h2>2. Property</h2>
      <p><strong>Property:</strong> ${propertyTitle}</p>
      <p><strong>Location:</strong> ${propertyLocation}</p>
    </section>
    <section>
      <h2>3. Purchase Price</h2>
      <p><strong>Price:</strong> ${money(salePrice, currency)}</p>
    </section>
    <section>
      <h2>4. Conditions Precedent</h2>
      <p>Conditions such as due diligence, ownership checks, and financing approval apply as agreed.</p>
    </section>
    <section>
      <h2>5. Transfer and Possession</h2>
      <p><strong>Proposed Transfer Date:</strong> ${dateLabel(transferDate)}</p>
    </section>
    <section>
      <h2>6. Special Conditions</h2>
      <div style="white-space:pre-wrap;border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#fff;">${saleConditions}</div>
    </section>
    <section>
      <h2>7. Breach and Remedies</h2>
      <p>In case of breach, lawful notice and remedies apply, including cancellation or specific performance.</p>
    </section>
    <section>
      <h2>8. Dispute Resolution</h2>
      <p>Parties shall first seek good-faith resolution, then mediation/arbitration or competent courts.</p>
    </section>
    <section>
      <h2>9. Entire Agreement</h2>
      <p>This contract and addenda are the complete agreement between parties.</p>
    </section>
    <section>
      <h2>10. Electronic Signatures</h2>
      <p>Electronic signatures captured in PropAd are accepted by both parties.</p>
    </section>
  `;
}
