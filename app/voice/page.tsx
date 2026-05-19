"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, Sparkles, AlertCircle, FastForward } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Pigeon, FlyingPigeon } from "@/components/Pigeon";
import { PrimaryButton, SecondaryButton, PrivacyNote } from "@/components/Bits";
import { useApp } from "@/lib/store";
import { stashAudio } from "@/lib/audioStash";

function format(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceOnboarding() {
  const router = useRouter();
  const { loadSampleVoice } = useApp();
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

  const doneEnabled = seconds >= 90;
  const skipEnabled = recording && seconds >= 1;

  async function onStart() {
    if (recording) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType =
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : undefined;
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (e) {
      console.error(e);
      setError(
        "We couldn't access your microphone. Use the sample recording below to keep going.",
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
    const blob: Blob = await new Promise((resolve) => {
      recorder.addEventListener(
        "stop",
        () => {
          const out = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          resolve(out);
        },
        { once: true },
      );
      recorder.stop();
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
    stashAudio(blob, force);
    router.push("/transcribing?live=1");
  }

  function onSample() {
    loadSampleVoice();
    router.push("/transcribing?sample=1");
  }

  return (
    <AppShell back="/signup/details" title="Voice onboarding">
      <p className="text-[14px] text-[var(--color-ink-soft)] mb-3 text-center">
        Talk for around two minutes.
      </p>
      <p className="text-[13.5px] text-[var(--color-muted)] mb-3 text-center px-2">
        Tell us what you&apos;ve been into lately, what you wish you did more
        of, and what you keep coming back to.
      </p>
      <p className="text-[12px] text-[var(--color-muted)] mb-7 text-center px-2 italic">
        Pauses are okay — silence is part of how you talk.
      </p>

      <div className="relative h-56 mb-6 overflow-hidden rounded-3xl scrim">
        {recording && <FlyingPigeon />}
        <div className="absolute inset-0 grid place-items-center">
          <div
            ref={pigeonAltitudeRef}
            style={{ willChange: "transform" }}
          >
            <div className={recording ? "animate-float" : ""}>
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
            Done unlocks after 90 seconds
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
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onDone(true)}
          disabled={!skipEnabled}
        >
          <FastForward size={14} />
          Done now (demo · skip 90s)
        </button>
        <SecondaryButton onClick={onSample}>
          <Sparkles size={16} />
          Use sample recording
        </SecondaryButton>
      </div>

      <div className="grid gap-2 mb-2">
        <PrivacyNote>
          Demo build: audio is transcribed via ElevenLabs Scribe.
        </PrivacyNote>
        <PrivacyNote>
          Production HOMING would run this on-device so audio never leaves your
          phone.
        </PrivacyNote>
      </div>

      <details className="mt-4 text-[13px] text-[var(--color-muted)]">
        <summary className="cursor-pointer">Need a nudge?</summary>
        <p className="mt-2 leading-relaxed">
          Mention hobbies, games, music, sports, food, places, projects,
          languages, routines, or anything you would actually enjoy doing.
        </p>
      </details>
    </AppShell>
  );
}
