# PropAd Product Specification

## Listings Lifecycle
- Agents and landlords can create or edit property listings with support for image uploads.
- Automatically extract EXIF and GPS metadata from uploaded images to provide verification signals.
- Listings may be submitted for verification, entering a queue for verifiers.
- Verifiers can select an evaluation method (AUTO, CALL, SITE, DOCS), record the result (PASS/FAIL), and attach supporting evidence.
- Verified properties display a ✅ badge, gain higher ranking in search results, and surface a brief verifier note to end users.

## Discovery & PWA Experience
- Home feed includes filters for rent/sale, suburb, price caps, rooms, and amenities, with a map/list toggle view.
- PWA Lite Mode ensures pages remain ≤1MB by prioritising text-first listing views, lazy-loading imagery, and caching recent searches for offline access.

## Leads & Contact
- Listings provide a "Contact via WhatsApp" button that opens a templated message and records a tracked shortlink back to the property.
- Optional phone and email relay channels enforce anti-spam rate limits.
- All leads are stored with attribution metadata covering WEB, WHATSAPP, FACEBOOK, and SHORTLINK sources.

## Agent Rewards
- A configurable reward pool percentage of the monthly platform revenue (supplied via environment configuration).
- Reward events include LISTING_VERIFIED, LEAD_VALID, SALE_CONFIRMED (with optional micro-cash credit).
- Monthly pool distribution is calculated as agentPoints / totalPoints, with live estimates displayed.
- Agent dashboard presents points balances, monthly projections, rank, recent reward events, and payout requests.

## Promotions
- Agents can purchase PromoBoost packages ($1–$5 tiers) that temporarily float a listing to the top of its suburb feed.
- 30% of promo revenue, configurable via environment variables, automatically credits the reward pool.
- Active boosts influence sorting order within the suburb and log PROMO_REBATE reward events.

## Admin & Verification Tools
- Back-office queues include verification backlogs, payout approvals, and strike reviews.
- A policy engine scans listings for banned phrases (e.g. "viewing fee", "tenant registration fee"), creating PolicyStrike records and blocking publication.
- Feature flags control access to promotions, reward pool percentages, WhatsApp bot integrations, and Facebook autoposting.

## Agency Management
- Agencies maintain profiles with licensing, contact, address, branding, KYC status, and an activation state. Public profile pages surface a verified badge and appear as filters within property search.
- Agency members link users to agencies via OWNER, MANAGER, or AGENT roles. Owners and managers can invite or remove agents, assign properties, configure promotions, review team analytics, and manage wallet payouts. Agents operate on behalf of their agency.
- Management contracts connect agencies with landlords, capturing term, management scope (letting only or full management), flat or percentage fee structures, supporting notes, and contract lifecycle states.
- When a landlord signs a management contract the associated properties reference the agency and set `isManaged = true`, unlocking portfolio dashboards, task tracking, and revenue attribution for the team.
- Agency analytics reports include managed stock by status, lead volume, verification ratios, average days-on-market, revenue share, and payout history.
