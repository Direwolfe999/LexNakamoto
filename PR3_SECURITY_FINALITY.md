# PR 3: Institutional Security & Finality
*   **Feature 7: Webhook Notification Integrations.** Backend now reliably pings Discord, Slack, or email via webhooks immediately when an escrow reaches `fast-path-secure`, accelerating contractor start times.
*   **Feature 8: Anti-Fake Token Guardrails.** Fully implemented `contract-of` SIP-010 mapping ensuring a rogue token can never masquerade as `sBTC` within an escrow.
*   **Feature 9: Auto-Clawback Mechanics.** Built a 30-day (518.4K block) inactivity timeout where if no action is performed and the arbiter is dormant, the buyer can systematically sweep unreleased funds.
