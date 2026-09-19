# VibeCheck

Find the person whose offer complements your need. Create a networking card,
join an event, send an AI-assisted introduction and keep the connections you accept.
The original dark/yellow event identity, complementary matching and team credit
are preserved in this portfolio fork of [vinhbin/VibeCheck](https://github.com/vinhbin/VibeCheck).

## Local setup

Use Node 22.18+. Run `npm ci`, copy `.env.example` to `.env`, and copy
`server.env.example` to `server.env`. Fill in the Supabase URL/public anon key
in both files, the proxy URL in `.env`, and Gemini key only in `server.env`.
Run `npm run dev` and `npm run proxy` in separate terminals. Match ALLOWED_ORIGIN
to the frontend port printed by Vite. `server.js` is the canonical proxy;
`server.py` is historical and does not implement the new session boundary.

On a **new Supabase project**, run `supabase/functions.sql`, then migrations
001 through 004 in order. Enable anonymous sign-ins in Supabase Auth. These
are authenticated, device-persisted sessions with owner IDs, not public anon-key
write access. Enable Realtime for `vibe_cards`, `matches` and `events`.

On an **existing project**, back up first and review migration 004 separately.
Previously public PINs cannot establish identity. Existing records remain unowned
until an administrator verifies and maps ownership; clearing browser data does
not recover ownership. The migration removes PINs and invalidates incompatible
3072-dimensional derived embeddings for regeneration. It does not delete cards.
No migration or service deployment was performed by this portfolio branch.

Optional avatar uploads require an `avatars` bucket with a 5 MB limit and only
JPEG, PNG and WebP MIME types. Restrict writes to authenticated users whose ID is
the first path folder; remove any older public write policies before enabling
uploads. Uploaded photos are public profile media. Emoji/URL avatars work without
storage provisioning. Storage policies are deployment-specific and not tested here.

## Mechanisms and boundaries

- React 18, React Router, Vite and Tailwind; room/editor routes load on demand.
- Supabase PostgreSQL + pgvector stores 768-dimensional need/offer vectors.
  Need queries compare against other attendees' offers, not generic similarity.
- SQL policies restrict mutations to record owners; match reads to participants.
  Only the recipient can move pending → accepted/declined. Server-generated
  snapshots prevent forged contact data; accepted/declined records cannot be reset.
- Cards and event descriptions are networking profiles visible to signed-in
  attendees. Event codes are discovery links, **not private-room authorization**.
- Express validates Supabase access tokens before bounded Gemini requests, with
  IP rate limiting, abort timeouts and dimension checks. No private prompt logs.
- SSE icebreakers retain a local fallback if AI is unavailable; embedding failures
  remain failures. Exported CSV protects formula cells; vCards escape properties.
- Realtime changes and reconnects refresh room data; a 30-second recovery refresh
  handles missed deletes. Save errors remain actionable instead of showing success.

## Verify

```sh
npm test
npm run build
npm audit --audit-level=high
```

Tests run SQL migrations and ownership/matching/capacity checks in PGlite with
pgvector, plus proxy validation and export cases. No Gemini or live Supabase calls
are made. PGlite does not validate hosted Supabase Auth, Realtime or Storage
configuration; validate those integrations in staging before deploying.

## Contribution context

Team project at HackLanta 2026. The supplied resume attributes cards, matches and
room UI to Guttu. This later fork modernization is separately documented and does
not reassign the original team's work. Existing screenshots under
`public/screenshots` represent the original app, not verification of a deployment
of this branch. See [CODEX_PLAN.md](CODEX_PLAN.md).
