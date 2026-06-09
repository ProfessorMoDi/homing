# HOMING — Build Modes

**One Vercel project, one Neo4j graph.** The normal site is the version you
send to friends (it fills the network); visiting **`/demo`** is the read-only
showcase that reads the same network. A build-time env var
(`NEXT_PUBLIC_APP_MODE`) picks what "the normal site" is.

| Mode | Where | Who it's for | Flow | Writes? |
|------|-------|--------------|------|---------|
| `collect` | normal site (set env) | The link you send to friends | signup → voice → themes → quick profile → **done** | **Yes — real users** |
| `demo` | the **`/demo`** path (always) | Public showcase | `/demo` → "find your people" | **No — read-only** |
| `full` | normal site (default if env unset) | Hackathon demo / dev | signup → … → match → verify → chat → feedback → group | Yes |

`/demo` is demo mode **regardless of env** — it's path-driven, so the normal
site and the showcase live in the same deployment. Set the env var to choose
what the rest of the site (everything outside `/demo`) does.

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

## Deploying (one Vercel project)

Set a single env var on the project:

```bash
NEXT_PUBLIC_APP_MODE=collect   # the normal site = the friends/data-collection build
```

`vercel env add NEXT_PUBLIC_APP_MODE` (or set it in the dashboard).
`NEXT_PUBLIC_*` is inlined at build time, so redeploy after changing it.

- **Send friends the root URL** — they go through signup → voice → interests and
  land in the network.
- **Share `https://<your-app>/demo`** for the read-only "find your people"
  showcase. It reads the same graph the friends are filling, and writes nothing.

Seed the shared graph once (12 starter personas + ontology) so `/demo` isn't
empty before friends sign up:

```bash
curl -X POST https://<your-app>/api/neo4j/seed
```

---

## Testing locally

```
http://localhost:3457/demo             → the read-only showcase (always)
http://localhost:3457/?mode=collect    → force the collect site
http://localhost:3457/?mode=full       → force the full demo
```

`/demo` is always the showcase. For the rest of the site, `NEXT_PUBLIC_APP_MODE`
sets the default and the client honours a `?mode=collect|full` override
(persisted in `localStorage`, same pattern as `?dev=1`) so one dev server
exercises everything. `?mode=demo` is intentionally ignored — demo is the
`/demo` path, never a sticky global state.

---

## What changed in the code

| File | Change |
|------|--------|
| `lib/appMode.ts` | New. Source of truth: `appMode()`, `isFull/isCollect/isDemo`, `writesEnabled()`. Env default + client `?mode=` override. |
| `lib/neo4jClient.ts` | Every write helper early-returns when `!writesEnabled()` (demo mode writes nothing). Reads/matching untouched. |
| `app/api/neo4j/match-live/route.ts` | New **read-only** matcher. Takes raw interests, canonicalises them, ranks the whole graph by shared-interest score. No Activity node, no writes. |
| `app/demo/page.tsx` | The "find your people" compatibility leaderboard (was the demo navigator). The `/demo` path is always demo mode. |
| `app/map/page.tsx` | The old presenter navigator, relocated off `/demo`. |
| `app/collect/done/page.tsx` | New. The collect build's terminal "you're in the flock" screen. |
| `app/signup/details/page.tsx` | In collect mode, finishing the profile routes to `/collect/done` instead of `/suggestions`. |
| `app/page.tsx` | Landing is mode-aware: collect copy + hidden demo-skip; header "Demo" link → `/demo`; full unchanged. |

The `full` build is unchanged — the existing demo, `DEMO.md` playbook, and dev
panel all work exactly as before when `NEXT_PUBLIC_APP_MODE` is unset.
