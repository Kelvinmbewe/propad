# Release Validation Checklist

This checklist captures the manual validation we run before promoting a PropAd build to stakeholders. Each suite focuses on cr
itical workflows that connect marketing delivery, discovery, agency operations, inventory quality, and messaging reliability.

## Direct Ads
- [ ] Create a new advertiser account and confirm campaign, flight, and placement hierarchies can be saved.
- [ ] Attach a creative to the placement and load a preview page to ensure the asset renders correctly.
- [ ] Trigger ad delivery and confirm impression and click counters increment in reporting.
- [ ] Pause the parent campaign and verify downstream flights and placements stop serving immediately.
- [ ] Export the campaign performance CSV and confirm column headers and totals match in-platform analytics.

## Map Search
- [ ] Pan or zoom the map then click **Search this area** to confirm listing results refresh for the current viewport.
- [ ] Draw a suburb polygon filter and verify only properties inside the boundary appear in the list view.
- [ ] Open a verified listing and confirm the verification badge is visible on the map pin and detail drawer.
- [ ] Hover a card in the list and ensure the corresponding map marker highlights; repeat by hovering the marker.

## Agencies
- [ ] Create an agency profile with licensing and contact details, then invite a new agent via email.
- [ ] Accept the invite and confirm the agent appears under the agency membership roster.
- [ ] Generate a management contract linking the agency to a landlord-owned property and set the property as managed.
- [ ] Visit the agency dashboard to check portfolio metrics (managed stock, lead volume, revenue share) reflect the contract.

## Property Search
- [ ] Publish a commercial property listing that includes `floorArea` details.
- [ ] Run a property search with commercial and floor area filters to verify the listing surfaces in results.
- [ ] Open the property detail page and validate structured data snippets (JSON-LD) render in the page source.

## Conversations
- [ ] Submit a lead form and confirm a conversation record is created for the agent.
- [ ] Exchange messages between lead and agent and verify they stream in real time for both participants.
- [ ] Upload an attachment (image or PDF) and ensure the preview renders with download controls.
- [ ] Rapidly send messages from the same user to trigger spam rate limiting and confirm the UI surfaces feedback.
- [ ] Download an admin transcript export and confirm the attachment references and timestamps are included.

Document the date, build number, and responsible tester alongside this checklist for each release candidate.
