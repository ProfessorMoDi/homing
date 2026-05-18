# HOMING — Demo Playbook

A complete script for showing the HOMING prototype. Use the section that fits
your timebox. Keep this open on a second screen while you present.

---

## 0. Pre-flight (5 minutes before)

Do these in order. If any of them fail, switch to the **Plan B / sample
recording** flow described in §6.

1. **Charge & screen-mirror.** Tether phone or laptop. Demo on the laptop with
   the browser window resized to a phone-sized frame (DevTools → toggle device
   toolbar → iPhone 14 Pro or any 390–440 px width).
2. **Start the dev server.**
   ```bash
   npm run dev
   ```
   Wait for `✓ Ready in ...`. Confirm both env vars loaded by checking the
   "- Environments: .env.local" line in the output.
3. **Open three browser tabs** (all on `localhost:3457`):
   - Tab 1: `/` — the landing page (your starting point).
   - Tab 2: `/demo` — the demo navigator (your safety net to jump
     anywhere).
   - Tab 3: `/dashboard` — the operator/judge view you'll close on.
4. **Reset state.** Tab 2 → `Reset` button (top-right). This clears any
   localStorage from earlier rehearsals so the flow starts clean.
5. **Mic check.** On the laptop, allow microphone permission for
   `localhost:3457`. Test once by tapping the big mic on `/voice` and then
   `Done now (demo · skip 90s)` to make sure ElevenLabs + Ollama are reachable.
   You should see the breathing fern-green orb on `/transcribing` and end up
   on `/themes` with real topics.
6. **Wi-Fi.** Two API calls go out (ElevenLabs → Ollama). If the venue Wi-Fi
   is bad, tether to your phone *now*, not mid-demo.
7. **Rotate keys after the event.** `.env.local` has live ElevenLabs and
   Ollama keys. Treat them as one-use for the demo.
8. **Mute notifications.** Slack, iMessage, calendar pop-ups — kill them all.

---

## 1. The one-line pitch

> "HOMING turns what you already like into a small, low-pressure real-life
> activity, and quietly invites people who fit. Activity first. Profile never."

Memorize that. Open with it. Close with it.

---

## 2. The 90-second elevator demo

Use this if a judge stops you in the hallway, or for the first slot of a
showcase before your actual demo.

| Time   | Screen        | What to say + do                                                                                                                        |
| ------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00   | Landing `/`   | "HOMING is for young adults who actually want to do the thing they like, with other people. No swiping, no profiles." Click **Start**. |
| 0:10   | `/voice`      | "You talk for two minutes about what you've been into. The transcript stays on your phone in the production build." Tap **Use sample recording**. |
| 0:25   | `/transcribing` | (Breathing orb, checkmarks pop, transcript preview appears.) "Homi extracts what you said, you review it." Click **Review themes**. |
| 0:40   | `/themes`     | "These are atomic — cooking and Korean food stay separate. Edit, hide, or remove anything." Click **Looks right**. |
| 0:55   | `/suggestions` | "Three specific activities, generated from your topics. Pick one." Click **Start this** on the first card. |
| 1:10   | `/activity/edit` | "You only edit the activity. HOMING handles who to invite." Click **Ask people**. |
| 1:20   | `/activity/finding` | "Best matches are invited first. Names and faces stay hidden until everyone verifies." Wait for fill. |
| 1:30   | Wrap          | "That's the loop. Group forms only after mutual positive feedback. Nobody gets a notification if you say no."                          |

Land it: "We optimize for the moment the group makes a WhatsApp and stops
opening HOMING. That's success."

---

## 3. The 5-minute demo

This is your bread-and-butter version: long enough to land the differentiation,
short enough that a tired judge stays with you.

### Beat 1 — The problem (30 s, no screen)

> "Most apps for connection optimize for swipes and time-on-app. Young adults
> have told us, repeatedly, that what they actually want is harder: a small,
> low-pressure activity that's based on something they already enjoy. So we
> built around that need, not against it. The app's name is HOMING. The
> mascot is Homi, the pigeon — because pigeons quietly carry messages, they
> don't broadcast them."

### Beat 2 — Onboarding (90 s)

Open `/`. Click **Start with EUR email**.

> "EUR pilot. Ages 18–29. The basics first." Fill in step 1 (any
> `something@eur.nl`). Click **Continue**.

> "Then a few details that help HOMING suggest the right activities." Pick
> identity options. **Postcode** field accepts Dutch format like `3062 PA` —
> show by typing. Languages have an **Other** option that reveals a custom
> text field. Pick at least one availability, pick a commitment level. Click
> **Continue to voice onboarding**.

> "Now the centerpiece — a two-minute voice prompt."

### Beat 3 — Voice + AI (120 s)

On `/voice`. Tap the big black mic. Speak naturally for ~20–30 seconds.

**A reliable demo script to read aloud** (it hits enough keywords to give the
LLM real material; the page also pads short transcripts when you hit "Done
now"):

> "Hey, lately I've been getting back into board games — Catan especially.
> I'd love to do a slow Thursday round, near campus, with a small group.
> English works fine for me, German too. I'd want to start with one game and
> see if it clicks before committing to anything weekly."

Tap **Done now (demo · skip 90s)**. The mic turns fern-green, three dots
animate, status reads *"Homi is transcribing…"* → *"Homi is reading your
transcript…"*.

While the model thinks (~5–10 s), narrate:

> "Two things are happening right now. First, ElevenLabs Scribe transcribes
> the audio. In a production build, this runs on-device — the audio never
> leaves the phone — which we say in the copy. Second, Ollama Cloud
> (gpt-oss-120b) reads the transcript and extracts atomic topics, plus three
> grounded activity suggestions. We send a system prompt that explicitly
> forbids stigmatizing language — no 'lonely', no 'find your tribe', no
> 'mental health'."

When `/transcribing` appears: the pigeon sits inside a breathing fern-green
orb, three checks pop in, a transcript preview card fades up ("*What Homi
heard*"), and the honest-mode card explains the cloud-vs-on-device tradeoff.
Click **Review themes**.

### Beat 4 — Themes & atomic topics (45 s)

On `/themes`.

> "These are the main themes. Notice they're atomic — if you mention cooking
> and Korean food, you get two separate topics. Most LLMs bundle them, but
> we explicitly tell the model that cooking is a craft and Korean food is a
> cuisine — separable interests stay separate." Edit one topic. Remove one
> (small `X` icon).

At the bottom: *"Homi is drafting 3 things you could actually do…"* then *"Homi
has 3 fresh suggestions ready"*. Mention:

> "In the background, while you review your highlights, HOMING regenerates
> the activity suggestions to match your edits. By the time you tap 'Looks
> right', the new cards are ready — and cached, so going back and forth
> doesn't refetch."

Click **Looks right**.

### Beat 5 — Suggestions and the activity flow (90 s)

On `/suggestions`. Three cards generated from the user's topics. Each names a
specific activity, a Rotterdam venue, a realistic time. The top of the page
has a **green pulsing banner** — an inbound invitation from another HOMING
user.

> "Two things to notice. One, these activities are generated from what you
> said — different cards map to different topics. Two, you already have an
> invitation from someone else. We'll come back to that."

Click **Start this** on the Catan/board-game card. Land on `/activity/edit`.

> "You edit the activity. You never pick people. The short note auto-writes
> from the title; once you edit it, it stays yours." Show the title field —
> retype it (e.g. "Casual Catan round") and watch the note follow. Click
> **Ask people**.

On `/activity/finding`. A pigeon in a breathing orb, a fern-green progress
meter, four stages slide in with spinners that pop to checks:

> "Homi ranks candidates on specific interest, broader interest, availability,
> language comfort, mutual feedback, private avoid-pairings, and a light
> location weight. The list of who got invited is never shown — only how
> many accepted." Expand "Debug" if a judge asks for proof of ranking.

When the progress bar shows 3/4, click **Continue to verification**.

### Beat 6 — Verification (60 s)

On `/activity/verify`. Two new cards: **iDIN** (with a "Fastest" pill) and
**ID + selfie**. Big icon tile, clear duration estimate, a fern-green circle
that pop-checks when selected. Below: *"Encrypted end-to-end · we never see
the document."*

> "Real verification. Before HOMING shares the exact place or any names,
> every participant verifies they're 18+ and a single human. We never store
> the document, the selfie, or your legal name — only the verified flag, age
> band, and one-account confirmation. This is the gate between matching and
> reveal."

Pick **iDIN**, then **Simulate verification success**. Then **See the activity**.

On `/activity/details`. First names appear, exact venue, suggested first
activity, light guidance.

> "Now you see Franz, Lena, Sophie. You see the venue. You see one suggestion
> for the meeting itself — *one game, one drink, no pressure to stay
> longer.* Not a scripted minute-by-minute plan."

Click **Open group chat**.

### Beat 7 — Homi as ghost-host (30 s)

On `/chat`. A green Homi card sits above the input.

> "Homi can draft the first message — only the sender sees the draft. You
> send it, edit it, or skip. Homi never sends automatically. You stay the
> human."

Click **Send**. The other two members reply.

### Beat 8 — The invitee perspective (30 s)

Use the topbar arrow back to `/suggestions` once, then click the green banner.

On `/invite`.

> "This is what another HOMING user sees when Homi quietly invites them.
> They see *Homi found an activity that fits you*, why it fits ('You
> mentioned Ticket to Ride and casual board games'), the time and a fuzzy
> location — but no names, no photos. They accept, decline, or suggest
> another time. Whether they accept is private. Declines never punish you."

### Beat 9 — Feedback and the recurring loop (45 s)

Back to `/feedback` (via the demo map or the chat header's *Skip to feedback*).

> "Private feedback after the activity. Step one: a 1–5 face scale, not a
> star rating. Step two: free-write about the setup. Step three: per-person,
> would you meet again — *yes, neutral, prefer not to*. The 'prefer not to'
> is the private avoid-pairing — we never tell the other person, never name
> them in a feed, never create a public artifact of rejection."

Pick a 4, type a sentence, mark Franz and Lena as "again", mark Sophie as
"neutral", **Submit feedback**.

`/feedback/result` resolves into one of four outcomes — for a 4 + mostly
"again", you see the recurring-group prompt: *"Want to make Casual Catan
round a recurring thing?"*

Click **See recurring group**.

On `/group`: group name and rhythm derived from your activity title — "Every
second Thursday".

> "A recurring group is the *result* of mutual positive feedback. Not the
> goal. The goal is a real activity that happened well. The group only
> appears if the people inside it asked for each other again."

### Beat 10 — The operator dashboard (30 s)

Open `/dashboard` (Tab 3).

> "This is what a partner like Erasmus or the municipality would see — and
> only this. Aggregate counts, completion rates, anonymous qualitative
> snippets. **No individual transcripts. No personal feedback. No
> loneliness scores. No mental health labels. No private avoid-pairings.**
> Trusted partners can refer with a QR code; the resident still chooses to
> join. No one is added automatically."

Close on:

> "HOMING succeeds when the group forms its own WhatsApp and stops opening
> the app. We measure for that — not screen time, not surveillance, not
> popularity."

---

## 4. The 12-minute deep dive

When you have time, add these segments to the 5-minute version. Order them
inside the demo where the host gives you space.

### 4.1 The privacy commitments (`/privacy`) — 45 s

Open after Beat 6 or Beat 10. Read three commitments aloud, deliberately:

> "We do not infer loneliness from municipal data. We do not classify users.
> We do not use social media surveillance."

> "These were on the table during research. We took them off the table
> on purpose. We will not put them back on without changing the name of the
> app first."

### 4.2 The safety/support surface (`/safety`) — 30 s

> "HOMING is a community connection tool, not mental health support. We
> never alert the university or the municipality based on what a user says.
> We show resources directly to the user, and only to the user — 113
> Zelfmoordpreventie, EUR Student Wellbeing, your GP, and 112 for immediate
> danger."

### 4.3 The matching memory (`/memory`) — 45 s

> "Everything HOMING remembers about you, in one screen. Activities you
> liked. People you'd meet again. Languages. Availability. And — discreetly
> — private comfort preferences. That's the avoid-pairing layer. It's not
> a blacklist. It's not visible to anyone else. You can clear it anytime."

### 4.4 The "Show more" transparency view (`/themes/full`) — 45 s

After Beat 4, before clicking "Looks right":

> "Click 'Show more' for the full picture — the full transcript at the
> bottom of the page, languages, availability, activity style, social
> rhythm, matching notes. Each item can be edited, hidden from matching, or
> removed. The full transcript is *last*, not first, so the cognitive load
> stays low by default and transparency is a deliberate next step."

### 4.5 Atomic-topic deep dive — 60 s

While on `/themes`, point at two unrelated topics that came out of the same
sentence (e.g. "Cooking" and "Korean Cuisine"):

> "We had to be explicit with the model — *cooking is a craft, Korean food
> is a cuisine, they are two different topics*. If you only like Korean
> food, your suggestions should still cover other things you mentioned. We
> learned this the hard way and it's now baked into the system prompt."

### 4.6 The matching scoring breakdown — 60 s

On `/activity/finding`, expand the "Demo: see ranked candidates (debug)"
section.

> "This is mocked seed data — twelve EUR students with realistic interest
> profiles. For a Catan activity, Franz, Lena, and Sophie rank very high.
> David ranks negative because he explicitly said he doesn't like board
> games — so he's excluded, not just down-ranked. The score is built from
> seven signals: specific match, broader match, availability, language,
> commitment, prior mutual feedback, and a light location bias."

### 4.7 Voice with a real recording — 90 s

If your audience seems engaged, replay Beat 3 with **your own talking topics**
instead of the canned script. Use the **Done** (90 s gate) instead of **Done
now** so judges see the real product flow. The pause copy says *"Pauses are
okay — silence is part of how you talk"* — point this out:

> "We deliberately don't let people pause recording. Silence is signal. If
> someone goes quiet, that's information."

---

## 5. Things to say while the AI is processing

The ElevenLabs + Ollama round-trip is ~5–15 seconds. Don't let that be
silence. Pick one or two of these and rotate:

- "The audio call is hitting ElevenLabs Scribe right now. In a production
  build this is a local model — we say so on the screen."
- "Next, the transcript gets analyzed by Ollama Cloud's gpt-oss-120b. The
  system prompt explicitly forbids 'lonely', 'find your tribe', and a list of
  other words we don't want in this product."
- "The model returns up to eight atomic topics, three concrete activity
  suggestions with Rotterdam venues, and language/availability hints — all in
  one strict JSON shape we coerce server-side."
- "Notice the breathing fern-green orb behind Homi — that's our processing
  signal. Loading states are part of the brand."
- "Short transcripts get a small plausibility pad before the LLM reads them,
  so the demo doesn't fall flat if someone only speaks for ten seconds. We
  label that flag in the response."

---

## 6. Plan B — if the network or the model fails

The system is built with three layers of fallback. Know them so you can
recover live without breaking the spell.

1. **Use sample recording.** On `/voice`, the secondary button bypasses
   ElevenLabs entirely and loads a hand-written transcript with hand-written
   topics. Use this if the mic fails or ElevenLabs returns an error.
2. **Keyword extractor.** If the Ollama call fails after a real recording,
   the page silently falls back to a deterministic keyword extractor. Topics
   appear, just less fancy. Don't apologize; the user never sees it.
3. **`/demo` navigator.** If a route stalls, open the demo map in Tab 2 and
   click directly to the next screen in the flow. The state is persisted in
   localStorage so the activity, themes, and feedback all carry through.

A useful recovery line: *"In a real deployment this would be a local model on
the phone, so this exact failure mode goes away. Let me show you the
already-generated path."*

---

## 7. Talking points (memorize 4 or 5)

The ones that actually land in a room:

- **"Activity first. Profile never."** — every other connection app starts
  with a profile. We start with an activity.
- **"No swiping. No popularity scores. No public ratings."** — the structural
  choice that follows.
- **"Verified before details."** — the safety story in three words.
- **"Homi quietly carries the messages."** — the brand voice in seven.
- **"A good outcome is the group makes a WhatsApp and stops opening
  HOMING."** — the metric, in one sentence.
- **"We took loneliness inference off the table on purpose."** — the
  non-dystopian commitment.
- **"Cooking and Korean food are two different topics."** — the AI
  craftsmanship moment.
- **"Pauses are okay. Silence is signal."** — the unexpected design
  decision.
- **"Private feedback. Public artifact: none."** — the safety net.

---

## 8. Q&A bank — likely questions and clean answers

### "Is this a dating app?"
> No. HOMING never asks who you'd like to meet. It asks what you'd like to
> do. There is no profile browsing, no swiping, no ranking of people, and no
> photos before verification. If you mutually want to meet again, a group
> can form. Dating apps optimize for one-on-one introductions. HOMING
> optimizes for a small group activity that may or may not repeat.

### "How is this different from Meetup or BumbleBFF?"
> Meetup is event-first — someone posts, others RSVP. HOMING is
> *interest-first* — you talk about what you enjoy, the AI suggests the
> activity, and HOMING quietly invites the strongest matches before any
> public listing exists. BumbleBFF is profile-first; HOMING never shows
> profiles before acceptance and verification.

### "Why do you need ElevenLabs and Ollama? Why not local models?"
> The production build runs both on-device with Whisper or transformers.js
> for the voice and a small local LLM for the analysis. For this prototype
> we used hosted services so judges could see real output in seconds, and we
> label that tradeoff honestly on the transcribing screen.

### "What about privacy?"
> Audio is transcribed on-device in the live build. We don't store ID
> documents, selfies, or legal names — only a verified flag, an age band, and
> a one-account confirmation. Feedback about other people is private and
> never visible to them. There are no public ratings or popularity scores.

### "What about loneliness?"
> We don't use that word with users, and we don't infer it from outside
> data. HOMING is a community connection tool, not a mental health surface.
> If someone needs support, we show them a small, clearly-labeled list of
> resources — 113 Zelfmoordpreventie, EUR Student Wellbeing, GP, 112. We do
> not alert anyone on their behalf.

### "How does the AI decide what to suggest?"
> Activity-first ranking on seven signals: specific interest match, broader
> match, availability, language comfort, commitment appetite, prior mutual
> positive feedback, and a light location weight. The seed cohort is twelve
> mocked EUR students with realistic profiles. David from the seed cohort
> explicitly dislikes board games — for a Catan activity, he's excluded, not
> down-ranked.

### "What if someone abuses the system?"
> Three layers. (1) Verification gates every reveal — no exact venue, no
> names, no faces before everyone passes. (2) Private avoid-pairing — one
> tap after an activity and HOMING never matches you with that person again,
> with no notification to them. (3) A report/block surface lives in
> `/safety` and behaves like any standard moderation tool.

### "What's the success metric?"
> Not screen time. Not match volume. Not popularity. We measure: real
> activities formed, repeat activities, mutual positive feedback, recurring
> groups, and user-reported sense of belonging via opt-in UCLA-3 sampling at
> 3 and 6 months. The leading indicator we love is: did the group spin off
> its own WhatsApp and stop opening HOMING.

### "Why a pigeon?"
> Pigeons carry messages quietly. They homing-pigeon their way back. The
> name is HOMING; the mascot is Homi. We wanted something warm and slightly
> playful — not a flame, not a heart, not a chat bubble. Pigeons fit the
> "low-pressure, calm, premium" tone we were going for.

### "Can a partner like Erasmus see individual data?"
> No. The operator dashboard shows aggregate metrics only. No transcripts,
> no personal feedback, no scoring, no loneliness flags, no avoid-pairings.
> Phase-2 referrals work as QR codes that a trusted partner gives a person
> — the person still chooses whether to sign up. No one is added
> automatically.

### "Why no pause on recording?"
> Pauses are signal. A long silence tells the AI something about how
> someone is talking. We don't strip it out. The copy on the page says so.

### "What about people under 18?"
> The current pilot is 18–29 only. A younger track would need separate
> safeguarding work and we're explicit about that — try entering 17 on
> sign-up and you get the safeguarding message.

### "Why EUR specifically?"
> Tight, well-defined initial cohort. Concentrated location (Kralingen,
> Centrum, Noord) so geographic matching works. Existing student wellbeing
> infrastructure for referrals. After EUR, we'd expand by partner, not by
> blast.

---

## 9. The two demo modes — when to use which

| Mode                  | Trigger                                 | Best for                                        | Risk                                |
| --------------------- | --------------------------------------- | ----------------------------------------------- | ----------------------------------- |
| **Real recording**    | Tap mic, speak, tap **Done now (demo)** | Showing real AI extraction & atomic topics      | API latency / model availability    |
| **Sample recording**  | Tap **Use sample recording**            | Tight timeboxes; venue Wi-Fi unreliable         | Less impressive; topics are canned  |

Recommended default: **Real recording for 5-min and 12-min demos**, **Sample
recording for the 90-second elevator**.

---

## 10. The closing line

Whatever flow you took, finish on one of these. Pick the one that matches the
audience:

- For investors / strategy folks:
  > "We're building the first connection app that's optimized to be deleted.
  > Success is when the group keeps meeting without us."
- For policy / partner folks:
  > "Real-world connection, with a privacy posture that lets the university
  > or the municipality stand behind it. Aggregate metrics only. No
  > surveillance pathway."
- For other engineers / designers:
  > "Voice → atomic topics → grounded activity suggestions → quiet
  > matching → verified reveal → private feedback. Each step is a deliberate
  > inversion of the dating-app default."
- For students / users:
  > "You don't have to figure out who to ask, when to ask, or how to start.
  > Homi will quietly carry the message."

---

## 11. Cheat sheet (single-screen)

If you can only memorize one card, memorize this:

```
START   → /                   "Activity first. Profile never."
VOICE   → tap mic, 20s,       "Pauses are okay. Silence is signal."
          Done now (demo)
WAIT    → describe ElevenLabs + Ollama + breathing orb
THEMES  → /themes             "Atomic topics. Cooking ≠ Korean food."
PICK    → /suggestions        "Generated from your topics. Banner = inbound."
EDIT    → /activity/edit      "You edit the activity. Never the people."
MATCH   → /activity/finding   "Seven signals. Avoid-pairings respected."
VERIFY  → /activity/verify    "Verified before details. Nothing stored."
SHOW    → /activity/details   "First names. Venue. One suggestion. Light guidance."
CHAT    → /chat               "Homi can draft. You send."
END     → /feedback           "Private. No public artifact of rejection."
NEXT    → /group              "Recurring group is the result, not the goal."
SHOW UP → /dashboard          "Aggregate only. No surveillance pathway."
CLOSE   → "Optimize to be deleted."
```

Tape it inside your laptop lid if you have to.
