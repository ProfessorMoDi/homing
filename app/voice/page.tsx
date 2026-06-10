"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, Sparkles, AlertCircle, FastForward } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Pigeon } from "@/components/Pigeon";
import { SkyScene } from "@/components/SkyScene";
import { PrimaryButton, SecondaryButton, PrivacyNote } from "@/components/Bits";
import { useApp } from "@/lib/store";
import { stashAudio } from "@/lib/audioStash";
import { useAppMode } from "@/lib/useAppMode";

function format(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceOnboarding() {
  const router = useRouter();
  const { loadSampleVoice, startVoicePipeline, clearVoiceDerivedState } =
    useApp();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const pigeonAltitudeRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (recording) {
      interval.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (interval.current) {
      clearInterval(interval.current);
      interval.current = null;
    }
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, [recording]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Pigeon altitude follows voice level: rises while you speak,
  // glides back down when you go quiet. Reads the live MediaStream
  // through an AnalyserNode and writes transform directly to the DOM
  // so we don't trigger a React render every frame.
  useEffect(() => {
    if (!recording) {
      const el = pigeonAltitudeRef.current;
      if (el) el.style.transform = "translateY(0)";
      return;
    }
    const stream = streamRef.current;
    if (!stream) return;

    const AudioCtx: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.65;
    source.connect(analyser);

    const buf = new Uint8Array(analyser.fftSize);
    const SPEECH_FLOOR = 0.018; // below this is treated as silence
    const MAX_LIFT_PX = 70; // peak altitude
    const RISE = 0.09;
    const FALL = 0.025;
    let current = 0;
    let cancelled = false;

    function tick() {
      if (cancelled) return;
      analyser.getByteTimeDomainData(buf);
      let sumSquares = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / buf.length);
      const target =
        rms > SPEECH_FLOOR
          ? Math.min(MAX_LIFT_PX, (rms - SPEECH_FLOOR) * 480)
          : 0;
      const factor = target > current ? RISE : FALL;
      current += (target - current) * factor;
      const el = pigeonAltitudeRef.current;
      if (el) {
        el.style.transform = `translateY(${-current.toFixed(2)}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      try {
        source.disconnect();
      } catch {}
      try {
        analyser.disconnect();
      } catch {}
      ctx.close().catch(() => {});
      audioCtxRef.current = null;
      const el = pigeonAltitudeRef.current;
      if (el) el.style.transform = "translateY(0)";
    };
  }, [recording]);

  const mode = useAppMode();
  const doneEnabled = seconds >= 25;
  const skipEnabled = recording && seconds >= 1;
  const showDemoTools = mode === "demo";

  async function onStart() {
    if (recording) return;
    setError(null);
    clearVoiceDerivedState();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType =
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : typeof MediaRecorder !== "undefined" &&
              MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : undefined;
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128_000 })
        : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onerror = (e) => {
        console.error("MediaRecorder error", e);
        setError("Recording hit a snag. Please try again.");
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
      };
      recorderRef.current = recorder;
      recorder.start(1000);
      setRecording(true);
    } catch (e) {
      console.error(e);
      setError(
        "We couldn't access your microphone. Check your browser permissions and try again.",
      );
    }
  }

  async function onDone(force = false) {
    if (!force && !doneEnabled) return;
    if (force && !skipEnabled) return;
    const recorder = recorderRef.current;
    if (!recorder) {
      router.push("/transcribing");
      return;
    }
    let blob: Blob;
    try {
      blob = await new Promise<Blob>((resolve, reject) => {
        const onStop = () => {
          recorder.removeEventListener("error", onError);
          resolve(
            new Blob(chunksRef.current, {
              type: recorder.mimeType || "audio/webm",
            }),
          );
        };
        const onError = (e: Event) => {
          recorder.removeEventListener("stop", onStop);
          reject(e);
        };
        recorder.addEventListener("stop", onStop, { once: true });
        recorder.addEventListener("error", onError, { once: true });
        recorder.stop();
      });
    } catch (e) {
      console.error("Stop failed", e);
      setError("We couldn't finish the recording. Try again.");
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setRecording(false);
      return;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
    if (seconds < 15) {
      setError(
        "That was quite short — results may be thinner. For best results, aim for 30 seconds next time.",
      );
    }
    stashAudio(blob, force);
    startVoicePipeline(blob);
    router.push("/signup/details?fromVoice=1");
  }

  function onSample() {
    loadSampleVoice();
    router.push("/transcribing?sample=1");
  }

  return (
    <AppShell back="/signup" title="Voice onboarding">
      <p className="text-[14px] text-[var(--color-ink-soft)] mb-3 text-center">
        Aim for about 30 seconds — say several interests.
      </p>
      <p className="text-[13.5px] text-[var(--color-muted)] mb-3 text-center px-2">
        Tell us what you&apos;ve been into lately, what you wish you did more
        of, and what you keep coming back to.
      </p>
      <p className="text-[12px] text-[var(--color-muted)] mb-7 text-center px-2 italic">
        Pauses are okay — silence is part of how you talk.
      </p>

      <div className="relative h-56 mb-6 overflow-hidden rounded-3xl scrim">
        <SkyScene active={recording} />
        <div className="absolute inset-0 grid place-items-center">
          <div
            ref={pigeonAltitudeRef}
            style={{ willChange: "transform" }}
          >
            <div className={recording ? "animate-float" : "animate-pigeon-sway"}>
              <Pigeon size={120} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="relative">
          {recording && (
            <>
              <span className="absolute inset-0 rounded-full bg-[var(--color-sage-soft)] animate-pulse-ring" />
              <span
                className="absolute inset-0 rounded-full bg-[var(--color-sage-soft)] animate-pulse-ring"
                style={{ animationDelay: "0.4s" }}
              />
            </>
          )}
          <button
            aria-label={recording ? "Recording" : "Start recording"}
            onClick={onStart}
            disabled={recording}
            className={
              "relative grid place-items-center h-24 w-24 rounded-full shadow-[0_8px_28px_rgba(27,29,28,0.18)] transition-transform " +
              (recording
                ? "bg-[var(--color-sage)] text-white cursor-default"
                : "bg-[var(--color-ink)] text-white active:scale-95")
            }
          >
            <Mic size={32} />
          </button>
        </div>

        <div className="text-center">
          <div className="display text-[32px] tabular-nums">
            {format(seconds)}
          </div>
          <p className="text-[12.5px] text-[var(--color-muted)] mt-1 inline-flex items-center gap-2 justify-center">
            {!recording && "Tap to start"}
            {recording && (
              <>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-clay)] animate-live-pulse" />
                Recording…
              </>
            )}
          </p>
        </div>

        {!doneEnabled && recording && (
          <p className="text-[12px] text-[var(--color-muted)]">
            Done unlocks after 25 seconds
          </p>
        )}
      </div>

      {error && (
        <div className="card-outline p-3 mb-4 flex items-start gap-2 border-[var(--color-clay)]">
          <AlertCircle size={16} className="text-[var(--color-clay)] mt-0.5 shrink-0" />
          <p className="text-[12.5px] text-[var(--color-ink-soft)] leading-relaxed">
            {error}
          </p>
        </div>
      )}

      <div className="grid gap-2.5 mb-6">
        <PrimaryButton onClick={() => onDone(false)} disabled={!doneEnabled}>
          <Square size={16} fill="currentColor" />
          Done
        </PrimaryButton>
        {showDemoTools && (
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onDone(true)}
              disabled={!skipEnabled}
            >
              <FastForward size={14} />
              Done now (demo · skip wait)
            </button>
            <SecondaryButton onClick={onSample}>
              <Sparkles size={16} />
              Use sample recording
            </SecondaryButton>
          </>
        )}
      </div>

      <NudgePrompt />

      <div className="grid gap-2 mt-5 mb-2">
        <PrivacyNote>
          Your voice is transcribed to text, then the audio is discarded.
        </PrivacyNote>
        <PrivacyNote>
          We never store the recording — only the interests you confirm.
        </PrivacyNote>
      </div>
    </AppShell>
  );
}

// The "need a nudge?" helper. Open by default and visually prominent — first-
// time users often freeze at the mic, so the prompt ideas sit right there
// instead of hiding behind a small toggle.
const NUDGE_IDEAS = [
  ["🎲", "What you've been into", "Board games, a sport, a show you binged, a game you keep replaying"],
  ["🎧", "What you make or create", "Music, photos, cooking, building things, writing"],
  ["🌧️", "Your Rotterdam", "Cafés, walks, neighbourhoods, spots you love or want to explore"],
  ["🗓️", "Your rhythm", "When you're free and how often you'd like to meet"],
] as const;

function NudgePrompt() {
  return (
    <div className="card-outline p-4 mt-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="grid place-items-center h-7 w-7 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)] shrink-0">
          <Sparkles size={14} />
        </span>
        <p className="text-[14px] font-medium text-[var(--color-ink)]">
          Not sure what to say? Talk about…
        </p>
      </div>
      <div className="grid gap-2.5">
        {NUDGE_IDEAS.map(([emoji, title, hint]) => (
          <div key={title} className="flex items-start gap-2.5">
            <span className="text-[15px] leading-none mt-0.5 shrink-0" aria-hidden>
              {emoji}
            </span>
            <p className="text-[12.5px] leading-relaxed text-[var(--color-ink-soft)]">
              <span className="font-medium text-[var(--color-ink)]">{title}.</span>{" "}
              {hint}.
            </p>
          </div>
        ))}
      </div>
      <p className="text-[11.5px] text-[var(--color-muted)] mt-3 leading-relaxed">
        No script needed — just talk. Pauses are okay; silence is part of how
        you speak.
      </p>
    </div>
  );
}
