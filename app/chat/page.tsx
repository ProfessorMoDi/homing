"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkle, Pencil, X, UserCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Avatar } from "@/components/Bits";
import { useApp } from "@/lib/store";
import { useAppMode } from "@/lib/useAppMode";
import type { Activity } from "@/lib/types";
import { formatDuration } from "@/lib/formatActivity";
import { ANON_SENDER_LABEL, sharedName } from "@/lib/identity";

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  ts: string;
  self?: boolean;
}

function activityNoun(title: string): string {
  const cleaned = title
    .replace(/^(start a |start the |try a |try the |begin a |begin the |a |the )/i, "")
    .trim();
  return cleaned || "this activity";
}

function buildDraft(a: Activity): string {
  const noun = activityNoun(a.title);
  const day = a.day?.trim();
  const duration = formatDuration(a.duration);
  const opener = day
    ? `Hey everyone, nice to meet you. HOMING matched us for ${noun} on ${day}.`
    : `Hey everyone, nice to meet you. HOMING matched us for ${noun}.`;
  const middle = duration
    ? ` I thought we could keep it simple: one round, around ${duration}, and see if we want to do it again sometime.`
    : ` I thought we could keep it simple: one round and see if we want to do it again sometime.`;
  return opener + middle;
}

const INITIAL: ChatMessage[] = [
  {
    id: "m_sys",
    sender: "HOMING",
    content: "You all verified. Group chat opened.",
    ts: "now",
  },
];

export default function Chat() {
  const router = useRouter();
  const { state, acceptedInvitees, setShareFirstName } = useApp();
  const isDemo = useAppMode() === "demo";
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL);
  const [draft, setDraft] = useState(() => buildDraft(state.activity));
  const [draftOpen, setDraftOpen] = useState(true);
  const [input, setInput] = useState("");
  const share = state.shareFirstName;
  const myName = state.signup.first_name?.trim();
  // Render a stored sender through the consent gate: HOMING and your own
  // messages are never anonymized; everyone else shows their first name only
  // once you've chosen to share yours.
  const showSender = (m: ChatMessage): string =>
    m.self || m.sender === "HOMING"
      ? m.sender
      : sharedName(m.sender, share, ANON_SENDER_LABEL);

  function send(content: string) {
    if (!content.trim()) return;
    setMessages((m) => [
      ...m,
      {
        id: "m_" + Math.random().toString(36).slice(2),
        sender: state.signup.first_name || "You",
        content,
        ts: "now",
        self: true,
      },
    ]);
    setDraftOpen(false);
    setInput("");
    const day = state.activity.day?.trim();
    // Replies come from the people the graph match actually surfaced, so the
    // chat reflects the same group as the details and finding screens.
    const firstReplier = acceptedInvitees[0]?.first_name;
    const secondReplier = acceptedInvitees[1]?.first_name;
    const firstReply = day
      ? `Yes! ${day} works for me. Looking forward to it.`
      : "Yes! Sounds good. Looking forward to it.";
    if (firstReplier) {
      setTimeout(() => {
        setMessages((m) => [
          ...m,
          { id: "m_r1", sender: firstReplier, content: firstReply, ts: "now" },
        ]);
      }, 1100);
    }
    if (secondReplier) {
      setTimeout(() => {
        setMessages((m) => [
          ...m,
          {
            id: "m_r2",
            sender: secondReplier,
            content: "Same here. See you all then.",
            ts: "now",
          },
        ]);
      }, 2200);
    }
  }

  return (
    <AppShell
      back="/activity/details"
      title={state.activity.title}
      right={
        isDemo ? (
          <button
            className="btn-ghost"
            onClick={() => router.push("/feedback")}
            title="Jump to feedback"
          >
            Skip to feedback
          </button>
        ) : undefined
      }
    >
      <div className="grid gap-3 mb-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              "flex items-end gap-2 " +
              (m.self ? "justify-end" : "justify-start")
            }
          >
            {!m.self && m.sender !== "HOMING" && (
              <Avatar name={showSender(m)} color="sky" />
            )}
            <div
              className={
                "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed " +
                (m.sender === "HOMING"
                  ? "bg-[var(--color-cream-warm)] text-[var(--color-muted)] text-[12.5px] italic mx-auto"
                  : m.self
                  ? "bg-[var(--color-ink)] text-white rounded-br-md"
                  : "bg-[var(--color-paper)] border border-[var(--color-line)] rounded-bl-md")
              }
            >
              {!m.self && m.sender !== "HOMING" && (
                <p className="text-[11.5px] text-[var(--color-muted)] mb-0.5">
                  {showSender(m)}
                </p>
              )}
              {m.content}
            </div>
          </div>
        ))}
      </div>

      {share === null && (
        <Card className="!bg-[var(--color-paper)] mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="grid place-items-center h-7 w-7 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]">
              <UserCheck size={14} />
            </span>
            <p className="text-[13px] font-medium">
              Share your first name{myName ? `, ${myName},` : ""} with this
              group?
            </p>
          </div>
          <p className="text-[12.5px] text-[var(--color-ink-soft)] leading-relaxed mb-3">
            HOMING keeps you anonymous by default. If you share, everyone here
            sees your first name — and you see theirs. You can stay anonymous
            and still chat.
          </p>
          <div className="flex gap-2">
            <button
              className="btn-primary !py-2 !text-[13px] flex-1"
              onClick={() => setShareFirstName(true)}
            >
              Yes, share my name
            </button>
            <button
              className="btn-secondary !w-auto !py-2 !text-[13px] px-3"
              onClick={() => setShareFirstName(false)}
            >
              Stay anonymous
            </button>
          </div>
        </Card>
      )}

      {share === false && (
        <p className="text-[12px] text-[var(--color-muted)] mb-4 inline-flex items-center gap-1.5">
          <UserCheck size={12} /> You&apos;re anonymous in this group.{" "}
          <button
            className="text-[var(--color-sage-deep)] font-medium underline"
            onClick={() => setShareFirstName(true)}
          >
            Share my name
          </button>
        </p>
      )}

      {draftOpen && (
        <Card className="!bg-[var(--color-sage-soft)] !border-transparent mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="grid place-items-center h-7 w-7 rounded-full bg-white text-[var(--color-sage-deep)]">
              <Sparkle size={13} />
            </span>
            <p className="text-[13px] font-medium text-[var(--color-sage-deep)]">
              Homi can draft the first message · only you can see this
            </p>
          </div>
          <textarea
            className="field min-h-24 mb-3 text-[13.5px]"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="btn-primary !py-2 !text-[13px] flex-1"
              onClick={() => send(draft)}
            >
              <Send size={14} />
              Send
            </button>
            <button
              className="btn-secondary !w-auto !py-2 !text-[13px] px-3"
              onClick={() => setDraftOpen(true)}
              title="Keep editing"
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              className="btn-ghost !text-[13px]"
              onClick={() => setDraftOpen(false)}
            >
              <X size={14} /> Skip
            </button>
          </div>
          <p className="text-[11.5px] text-[var(--color-sage-deep)] mt-2 opacity-80">
            Homi never sends automatically. You stay the sender.
          </p>
        </Card>
      )}

      <div className="sticky bottom-0 -mx-5 -mb-5 px-5 py-3 bg-[var(--color-cream)] border-t border-[var(--color-line)]">
        <div className="flex items-center gap-2">
          <input
            className="field"
            placeholder="Message the group"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send(input);
            }}
          />
          <button
            className="grid place-items-center h-10 w-10 rounded-full bg-[var(--color-ink)] text-white"
            onClick={() => send(input)}
          >
            <Send size={16} />
          </button>
        </div>
        <div className="flex justify-between mt-2">
          <button
            className="btn-ghost !text-[12px]"
            onClick={() => setDraftOpen(true)}
          >
            <Sparkle size={12} /> Ask Homi to draft
          </button>
          <button
            className="btn-ghost !text-[12px]"
            onClick={() => router.push("/reminder")}
          >
            Reminder preview →
          </button>
        </div>
      </div>
    </AppShell>
  );
}
