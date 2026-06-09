# HOMING — Build Modes

One codebase ships as **three distinct products**, selected by a single
environment variable (`NEXT_PUBLIC_APP_MODE`) and all sharing **one Neo4j
graph**. The collect build fills the network; the demo build reads it.

| Mode | Who it's for | Flow | Writes to graph? |
|------|--------------|------|------------------|
| `full` *(default)* | Hackathon demo / dev | signup → voice → themes → suggestions → match → verify → chat → feedback → group | Yes |
| `collect` | The link you send to friends | signup → voice → themes → quick profile → **done** | **Yes — real users** |
| `demo` | Public showcase | landing → **network** ("find your people") | **No — read-only** |

---

## Why this shape

You wanted two things:

1. **Collect real data.** Send a link to friends. They sign up, talk, confirm
   their interests, and that's it — every voice profile, interest, language, and
   availability lands in the shared graph as a real (non-demo) user. No activity
   flow, no matching UI; the goal is simply to grow the network.

2. **Show it off without touching it.** A separate, read-only build that connects
   to whatever the collect build accumulated and finds connections in a throwaway
   session. It ranks the people you're most "in sync" with and names the shared
   interests — a playful compatibility board, perfect for friends and demos. It
   **never writes**: every Neo4j mutation is a no-op in this mode.

Because both builds point at the same AuraDB, the demo gets richer every time a
friend signs up through the collect link.

---

## Deploying (recommended: two Vercel projects, one database)

Point both projects at the **same** `NEO4J_*` env values, then differ only on the
mode:

```bash
# Collect deployment — the link you share
NEXT_PUBLIC_APP_MODE=collect

# Demo deployment — the read-only showcase
NEXT_PUBLIC_APP_MODE=demo
```

`vercel env add NEXT_PUBLIC_APP_MODE` per project (or set it in the dashboard).
`NEXT_PUBLIC_*` is inlined at build time, so a redeploy is needed after changing
it.

Seed the shared graph once (12 starter personas + ontology) so the demo isn't
empty before friends sign up:

```bash
curl -X POST https://<your-collect-deploy>/api/neo4j/seed
```

---

## Testing all three locally

`NEXT_PUBLIC_APP_MODE` sets the default, but the **client** honours a `?mode=`
override (persisted in `localStorage`, same pattern as `?dev=1`). One dev server
exercises everything:

```
http://localhost:3457/?mode=collect   → collect landing + flow
http://localhost:3457/?mode=demo       → demo "find your people"
http://localhost:3457/?mode=full       → full demo (reset override)
```

---

## What changed in the code

| File | Change |
|------|--------|
| `lib/appMode.ts` | New. Source of truth: `appMode()`, `isFull/isCollect/isDemo`, `writesEnabled()`. Env default + client `?mode=` override. |
| `lib/neo4jClient.ts` | Every write helper early-returns when `!writesEnabled()` (demo mode writes nothing). Reads/matching untouched. |
| `app/api/neo4j/match-live/route.ts` | New **read-only** matcher. Takes raw interests, canonicalises them, ranks the whole graph by shared-interest score. No Activity node, no writes. |
| `app/network/page.tsx` | New. The demo build's "find your people" compatibility leaderboard. |
| `app/collect/done/page.tsx` | New. The collect build's terminal "you're in the flock" screen. |
| `app/signup/details/page.tsx` | In collect mode, finishing the profile routes to `/collect/done` instead of `/suggestions`. |
| `app/page.tsx` | Landing is mode-aware: demo CTA → `/network`; collect copy + hidden demo-skip; full unchanged. |

The `full` build is unchanged — the existing demo, `DEMO.md` playbook, and dev
panel all work exactly as before when `NEXT_PUBLIC_APP_MODE` is unset.
