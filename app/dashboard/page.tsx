"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, Activity, Repeat, ShieldCheck, QrCode, Radio, Sparkles } from "lucide-react";
import { AppShell, Section } from "@/components/AppShell";
import { Card, Pill } from "@/components/Bits";

interface NetworkStats {
  members: number;
  voice_profiles: number;
  liked_topics: number;
  likes: number;
  long_tail_likes: number;
}

interface NetworkRecent {
  id: string;
  name: string;
  neighbourhood: string;
  interests: string[];
  best_overlap: { name: string; shared: string[] } | null;
}

interface NetworkData {
  stats: NetworkStats;
  recent: NetworkRecent[];
  first_in_network: Array<{ topic: string; member: string }>;
}

const METRICS = [
  { label: "Active users", value: "1,284", trend: "+18% MoM" },
  { label: "Completed voice profiles", value: "942" },
  { label: "Activities suggested", value: "3,127" },
  { label: "Activities started by users", value: "612" },
  { label: "Invitations sent", value: "2,388" },
  { label: "Invitation acceptance rate", value: "61%" },
  { label: "Activities confirmed", value: "402" },
  { label: "Verification completion rate", value: "94%" },
  { label: "Activities completed", value: "366" },
  { label: "Repeat activity rate", value: "37%" },
  { label: "Recurring groups formed", value: "58" },
  { label: "Groups still active after 4 weeks", value: "41" },
  { label: "Opt-in wellbeing survey response", value: "29%" },
];

const SNIPPETS = [
  "Honestly the Catan night made my week.",
  "I liked that I didn't have to plan it.",
  "Verification before details made it feel safer.",
];

export default function OperatorDashboard() {
  const [network, setNetwork] = useState<NetworkData | null>(null);
  const [networkState, setNetworkState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/neo4j/network")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((data: NetworkData) => {
        if (cancelled) return;
        setNetwork(data);
        setNetworkState("ready");
      })
      .catch(() => {
        if (!cancelled) setNetworkState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell back="/" title="Operator dashboard">
      <p className="text-[13.5px] text-[var(--color-muted)] mb-5 leading-relaxed">
        Aggregate metrics for the EUR pilot. No individual transcripts, no
        personal feedback, no scoring of users.
      </p>

      <Section
        title="Live beta network"
        subtitle="Real signups from the friends beta — operator view, not for public display."
      >
        {networkState === "loading" ? (
          <div className="grid grid-cols-2 gap-2.5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="card animate-pulse h-20 bg-[var(--color-cream-warm)]"
              />
            ))}
          </div>
        ) : networkState === "error" || !network ? (
          <Card className="text-[13px] text-[var(--color-muted)] py-4 text-center">
            Graph unreachable — live network stats will appear once Neo4j is
            back.
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              {[
                { label: "Beta members", value: network.stats.members },
                { label: "Voice profiles", value: network.stats.voice_profiles },
                { label: "Distinct interests", value: network.stats.liked_topics },
                { label: "Long-tail interest links", value: network.stats.long_tail_likes },
              ].map((m) => (
                <Card key={m.label} className="!p-4">
                  <p className="text-[12px] text-[var(--color-muted)]">{m.label}</p>
                  <p className="display text-[22px] mt-1 tabular-nums">{m.value}</p>
                </Card>
              ))}
            </div>

            {network.recent.length > 0 && (
              <Card className="mb-3">
                <p className="text-[12px] uppercase tracking-wider text-[var(--color-muted)] font-medium mb-2 inline-flex items-center gap-1.5">
                  <Radio size={12} /> Newest members &amp; best overlap
                </p>
                <div className="grid gap-2.5">
                  {network.recent.map((m) => (
                    <div
                      key={m.id}
                      className="card-outline p-3 text-[13px] grid gap-1"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-[11.5px] text-[var(--color-muted)]">
                          {m.neighbourhood}
                        </span>
                      </div>
                      {m.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {m.interests.slice(0, 5).map((i) => (
                            <Pill key={i}>{i}</Pill>
                          ))}
                        </div>
                      )}
                      {m.best_overlap ? (
                        <p className="text-[12px] text-[var(--color-sage-deep)]">
                          Overlaps {m.best_overlap.name}:{" "}
                          {m.best_overlap.shared.slice(0, 3).join(", ")} — worth
                          a ping.
                        </p>
                      ) : (
                        <p className="text-[12px] text-[var(--color-muted)]">
                          No overlap in the network yet.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {network.first_in_network.length > 0 && (
              <Card>
                <p className="text-[12px] uppercase tracking-wider text-[var(--color-muted)] font-medium mb-2 inline-flex items-center gap-1.5">
                  <Sparkles size={12} /> Waiting for a match
                </p>
                <p className="text-[12px] text-[var(--color-muted)] mb-2">
                  Interests only one member has — when a new joiner overlaps
                  one of these, ping both.
                </p>
                <div className="grid gap-1">
                  {network.first_in_network.slice(0, 12).map((f) => (
                    <div
                      key={f.topic}
                      className="flex items-center justify-between text-[13px]"
                    >
                      <span className="text-[var(--color-ink-soft)]">{f.topic}</span>
                      <span className="text-[12px] text-[var(--color-muted)]">
                        only {f.member}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </Section>

      <Section title="Pilot targets (illustrative)">
        <div className="grid grid-cols-2 gap-2.5">
          {METRICS.slice(0, 6).map((m) => (
            <Card key={m.label} className="!p-4">
              <p className="text-[12px] text-[var(--color-muted)]">{m.label}</p>
              <p className="display text-[22px] mt-1">{m.value}</p>
              {m.trend && (
                <p className="text-[11.5px] text-[var(--color-sage-deep)] mt-1 inline-flex items-center gap-1">
                  <TrendingUp size={11} /> {m.trend}
                </p>
              )}
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Pipeline">
        <Card>
          <div className="grid gap-2">
            {METRICS.slice(6).map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between text-[13px]"
              >
                <span className="text-[var(--color-ink-soft)]">{m.label}</span>
                <span className="font-medium tabular-nums">{m.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Anonymous qualitative snippets">
        <div className="grid gap-2">
          {SNIPPETS.map((s) => (
            <Card key={s} className="!py-3 !bg-[var(--color-cream-warm)] !border-transparent">
              <p className="text-[13px] text-[var(--color-ink-soft)] italic">
                &ldquo;{s}&rdquo;
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        title="Phase 2 referral rails"
        subtitle="Trusted partners refer; residents choose."
      >
        <Card className="flex items-start gap-3">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-[var(--color-sand)] text-[#6a5326]">
            <QrCode size={16} />
          </span>
          <p className="text-[13px] text-[var(--color-ink-soft)] leading-relaxed">
            Trusted partners such as GPs or student wellbeing staff can refer a
            young adult into HOMING by giving them a QR code or link. The
            resident still chooses whether to join. No one is added
            automatically.
          </p>
        </Card>
      </Section>

      <Section title="Not visible here">
        <Card className="!bg-[var(--color-cream-warm)] !border-transparent">
          <ul className="text-[13px] text-[var(--color-ink-soft)] leading-relaxed grid gap-1">
            <li>· Individual transcripts</li>
            <li>· Personal feedback</li>
            <li>· Loneliness scores</li>
            <li>· Mental health labels</li>
            <li>· Private avoid-pairing preferences</li>
          </ul>
        </Card>
      </Section>
    </AppShell>
  );
}
