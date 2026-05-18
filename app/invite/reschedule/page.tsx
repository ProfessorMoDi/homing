"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, ChipToggle, PrimaryButton } from "@/components/Bits";

const OPTIONS = [
  "Thursday later",
  "Friday afternoon",
  "Weekend",
  "Suggest custom time",
];

export default function Reschedule() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [sent, setSent] = useState(false);

  function send() {
    setSent(true);
    setTimeout(() => router.push("/invite"), 1100);
  }

  if (sent) {
    return (
      <AppShell back="/invite" title="Suggest another time">
        <Card className="text-center">
          <p className="display text-[20px] mb-1">Sent.</p>
          <p className="text-[13.5px] text-[var(--color-muted)]">
            HOMING will check with the others and let you know.
          </p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell back="/invite" title="Suggest another time">
      <h1 className="display text-[22px] mb-1">Can&apos;t do Thursday 20:00?</h1>
      <p className="text-[13.5px] text-[var(--color-muted)] mb-5">
        Pick what would work better. HOMING will propose a revised time to the
        initiator if a few people agree.
      </p>

      <div className="grid gap-2 mb-5">
        {OPTIONS.map((o) => (
          <button
            key={o}
            onClick={() => setSelected(o)}
            className={
              "card text-left flex items-center justify-between " +
              (selected === o
                ? "!bg-[var(--color-ink)] !text-white border-[var(--color-ink)]"
                : "")
            }
          >
            <span>{o}</span>
            <span
              className={
                "h-4 w-4 rounded-full border " +
                (selected === o
                  ? "bg-white border-white"
                  : "border-[var(--color-line)]")
              }
            />
          </button>
        ))}
      </div>

      {selected === "Suggest custom time" && (
        <input
          className="field mb-5"
          placeholder="e.g. Wednesday 19:30 or Saturday afternoon"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
      )}

      <PrimaryButton onClick={send} disabled={!selected}>
        Send suggestion
      </PrimaryButton>
    </AppShell>
  );
}
