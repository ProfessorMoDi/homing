"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Cpu, Cloud, Quote } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CheckRow, PrimaryButton } from "@/components/Bits";
import { Pigeon } from "@/components/Pigeon";
import { BreathingOrb } from "@/components/Loading";
import { useApp } from "@/lib/store";

export default function Transcribing() {
  const router = useRouter();
  const params = useSearchParams();
  const isSample = params.get("sample") === "1";
  const isLive = params.get("live") === "1";
  const { state: app, loadSampleVoice } = useApp();
  const [stage, setStage] = useState(0);
  const [previewShown, setPreviewShown] = useState(false);

  useEffect(() => {
    if (!isSample && !isLive && app.topics.length === 0) {
      loadSampleVoice();
    }
  }, [isSample, isLive, app.topics.length, loadSampleVoice]);

  useEffect(() => {
    const timeouts = [
      setTimeout(() => setStage(1), 900),
      setTimeout(() => setStage(2), 1900),
      setTimeout(() => setStage(3), 2900),
      setTimeout(() => setPreviewShown(true), 1200),
    ];
    return () => timeouts.forEach(clearTimeout);
  }, []);

  const title = isLive ? "Transcription complete" : "Working on your phone";
  const subtitle = isLive
    ? "Your transcript is ready. Review the themes next."
    : "HOMING only uses the text and themes you approve.";

  const transcriptPreview = (app.transcript || "")
    .trim()
    .split(/\s+/)
    .slice(0, 22)
    .join(" ");

  return (
    <AppShell back="/voice" title="On-device transcription">
      <div className="relative h-44 mb-5">
        <BreathingOrb>
          <div className="animate-float">
            <Pigeon size={104} />
          </div>
        </BreathingOrb>
      </div>

      <h1 className="display text-[24px] text-center mb-1">{title}</h1>
      <p className="text-[13.5px] text-[var(--color-muted)] text-center mb-6 px-4">
        {subtitle}
      </p>

      <Card className="grid gap-3 mb-5">
        {isLive ? (
          <>
            <CheckRow
              label="Transcribed by ElevenLabs Scribe"
              hint="Demo build · cloud transcription"
              done={stage >= 1}
              loading={stage === 0}
            />
            <CheckRow
              label="Audio not retained"
              hint="The recording was processed and dropped."
              done={stage >= 2}
              loading={stage === 1}
            />
            <CheckRow
              label="Themes ready to review"
              done={stage >= 3}
              loading={stage === 2}
            />
          </>
        ) : (
          <>
            <CheckRow
              label="Transcribed on this phone"
              done={stage >= 1}
              loading={stage === 0}
            />
            <CheckRow
              label="Audio deleted"
              done={stage >= 2}
              loading={stage === 1}
            />
            <CheckRow
              label="Ready to review"
              done={stage >= 3}
              loading={stage === 2}
            />
          </>
        )}
      </Card>

      {transcriptPreview && (
        <Card
          className={
            "mb-5 transition-all duration-500 " +
            (previewShown
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 pointer-events-none")
          }
        >
          <div className="flex items-start gap-3">
            <span className="grid place-items-center h-8 w-8 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)] shrink-0">
              <Quote size={14} />
            </span>
            <div>
              <p className="text-[11.5px] uppercase tracking-wider text-[var(--color-muted)] mb-1">
                What HOMING heard
              </p>
              <p className="text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed italic">
                &ldquo;{transcriptPreview}
                {app.transcript && app.transcript.length > transcriptPreview.length
                  ? "…"
                  : ""}
                &rdquo;
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="flex items-start gap-3 mb-7">
        <span className="grid place-items-center h-9 w-9 rounded-full bg-[var(--color-sky-soft)] text-[#3b5a73] shrink-0">
          {isLive ? <Cloud size={16} /> : <Cpu size={16} />}
        </span>
        <div className="text-[13px] text-[var(--color-ink-soft)] leading-relaxed">
          {isLive ? (
            <>
              For this hackathon prototype we route audio to ElevenLabs Scribe
              and analyze the transcript with Ollama. A production HOMING would
              run both on-device.
            </>
          ) : (
            <>
              The model ran locally. No audio or transcript was sent to a
              server. You decide what HOMING keeps next.
            </>
          )}
        </div>
      </Card>

      <PrimaryButton
        onClick={() => router.push("/themes")}
        disabled={stage < 3}
      >
        Review themes
      </PrimaryButton>
    </AppShell>
  );
}
