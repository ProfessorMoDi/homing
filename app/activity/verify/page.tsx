"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  IdCard,
  Camera,
  Clock,
  Check,
  Lock,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CheckRow, PrimaryButton, SecondaryButton } from "@/components/Bits";
import { useApp } from "@/lib/store";
import { formatDayTime } from "@/lib/formatActivity";

type Method = "idin" | "id";

interface MethodOption {
  id: Method;
  icon: React.ReactNode;
  iconBgClass: string;
  title: string;
  subtitle: string;
  duration: string;
  badge?: string;
}

const METHODS: MethodOption[] = [
  {
    id: "idin",
    icon: <IdCard size={22} />,
    iconBgClass: "bg-[var(--color-sky-soft)] text-[#3b5a73]",
    title: "iDIN",
    subtitle: "Verify through your Dutch bank",
    duration: "~30 seconds",
    badge: "Fastest",
  },
  {
    id: "id",
    icon: <Camera size={22} />,
    iconBgClass: "bg-[var(--color-sand)] text-[#6a5326]",
    title: "ID + selfie",
    subtitle: "Document scan on this device",
    duration: "~1 minute · auto-deleted after",
  },
];

export default function Verify() {
  const router = useRouter();
  const { state, verifyUser } = useApp();
  const a = state.activity;
  const [method, setMethod] = useState<Method | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [done, setDone] = useState(false);

  function simulate() {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setDone(true);
      verifyUser("u_me");
    }, 1500);
  }

  return (
    <AppShell back="/activity/finding" title="Verification">
      <Card className="mb-5">
        <p className="display text-[19px]">{a.title}</p>
        <p className="text-[13px] text-[var(--color-muted)] mt-1">
          {formatDayTime(a.day, a.time)} · {a.group_size_target} people
        </p>
      </Card>

      <Card className="mb-5">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)] shrink-0">
            <ShieldCheck size={16} />
          </span>
          <div>
            <p className="text-[14.5px] font-medium mb-1">Enough people are in.</p>
            <p className="text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed">
              Before HOMING shares the exact place, everyone does the same
              quick check.
            </p>
          </div>
        </div>
      </Card>

      <Card className="mb-5">
        <p className="text-[13.5px] font-medium mb-2">What HOMING checks</p>
        <div className="grid gap-2">
          <CheckRow label="Age" hint="You are 18 or older." />
          <CheckRow label="Real, unique human" hint="One account per person." />
        </div>
        <div className="divider" />
        <p className="text-[13.5px] font-medium mb-2">What HOMING never stores</p>
        <div className="grid gap-2 text-[13px] text-[var(--color-ink-soft)]">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-clay)]" />
            Your ID document or document number
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-clay)]" />
            Selfie photo
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-clay)]" />
            Your full legal name
          </div>
        </div>
        <p className="text-[12.5px] text-[var(--color-muted)] mt-3">
          Kept: verified status, age band, one-account confirmation.
        </p>
      </Card>

      <p className="text-[11.5px] uppercase tracking-wider text-[var(--color-muted)] font-medium mb-2 px-1">
        Choose how to verify
      </p>
      <div className="grid gap-2.5 mb-5">
        {METHODS.map((opt) => {
          const selected = method === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMethod(opt.id)}
              aria-pressed={selected}
              className={
                "relative flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 " +
                (selected
                  ? "border-[var(--color-sage)] bg-[var(--color-sage-soft)] shadow-[0_4px_16px_rgba(79,121,66,0.18)]"
                  : "border-[var(--color-line)] bg-white hover:border-[var(--color-ink-soft)] hover:bg-[var(--color-cream-warm)] hover:-translate-y-px")
              }
            >
              <span
                className={
                  "grid place-items-center h-12 w-12 rounded-2xl shrink-0 transition-transform " +
                  opt.iconBgClass +
                  (selected ? " scale-105" : "")
                }
              >
                {opt.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <p className="text-[15.5px] font-semibold leading-tight">
                    {opt.title}
                  </p>
                  {opt.badge && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)] text-[10.5px] font-medium uppercase tracking-wider">
                      {opt.badge}
                    </span>
                  )}
                </div>
                <p className="text-[12.5px] text-[var(--color-ink-soft)]">
                  {opt.subtitle}
                </p>
                <p className="text-[11.5px] text-[var(--color-muted)] mt-1 inline-flex items-center gap-1">
                  <Clock size={11} />
                  {opt.duration}
                </p>
              </div>
              <span
                className={
                  "h-7 w-7 rounded-full grid place-items-center shrink-0 transition-all " +
                  (selected
                    ? "bg-[var(--color-sage)] text-white scale-100"
                    : "bg-white border-2 border-[var(--color-line)]")
                }
                aria-hidden
              >
                {selected && (
                  <Check size={14} strokeWidth={3} className="animate-pop-check" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[11.5px] text-[var(--color-muted)] inline-flex items-center gap-1.5 mb-5 px-1">
        <Lock size={11} /> Encrypted end-to-end · we never see the document
      </p>

      {!done && (
        <div className="grid gap-2">
          <PrimaryButton onClick={simulate} disabled={!method || verifying}>
            {verifying ? "Verifying…" : "Simulate verification success"}
          </PrimaryButton>
          <SecondaryButton onClick={() => router.push("/activity/finding")}>
            Cancel
          </SecondaryButton>
        </div>
      )}

      {done && (
        <Card className="text-center !bg-[var(--color-sage-soft)] !border-transparent">
          <p className="display text-[20px] mb-1 text-[var(--color-sage-deep)]">
            Verified.
          </p>
          <p className="text-[13px] text-[var(--color-sage-deep)] mb-4">
            HOMING is revealing the details now.
          </p>
          <button
            className="btn-primary !py-2.5"
            onClick={() => router.push("/activity/details")}
          >
            See the activity
          </button>
        </Card>
      )}
    </AppShell>
  );
}
