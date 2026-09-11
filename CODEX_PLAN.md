# VibeCheck modernization

Preserve React/Supabase, complementary matching and the original visual identity.
Implemented session-owned mutations, participant match reads, recipient-only
transitions, canonical 768-vector migration, authenticated Node proxy, export
safety and reconnect recovery. Added SQL/proxy/export tests and CI, lazy routes,
reduced-motion support and retryable session setup.

Four test suites pass (database, proxy and export cases); production build passes. Browser reviewed landing and unavailable-session recovery. Dependency audit has no high/critical findings, with three moderate findings remaining. Hosted Auth,
Realtime and Storage integrations are not verified. No live migration or upstream
modification. Existing PIN-based identity cannot be trusted for automatic recovery.
