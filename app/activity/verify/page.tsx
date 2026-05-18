"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, IdCard, Camera } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CheckRow, PrimaryButton, SecondaryButton } from "@/components/Bits";
import { useApp } from "@/lib/store";

export default function Verify() {
  const router = useRouter();
  const { state, verifyUser } = useApp();
  const a = state.activity;
  const [method, setMethod] = useState<"idin" | "id" | null>(null);
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
          {a.day} {a.time} · {a.group_size_target} people
        </p>
      </Card>

      <Card className="mb-5">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]">
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

      <div className="grid gap-2.5 mb-5">
        <button
          onClick={() => setMethod("idin")}
          className={
            "card text-left flex items-center gap-3 " +
            (method === "idin" ? "ring-2 ring-[var(--color-ink)]" : "")
          }
        >
          <span className="grid place-items-center h-9 w-9 rounded-full bg-[var(--color-sky-soft)] text-[#3b5a73]">
            <IdCard size={16} />
          </span>
          <div className="flex-1">
            <p className="text-[14px] font-medium">Verify with iDIN</p>
            <p className="text-[12.5px] text-[var(--color-muted)]">
              Via your Dutch bank · fastest
            </p>
          </div>
        </button>
        <button
          onClick={() => setMethod("id")}
          className={
            "card text-left flex items-center gap-3 " +
            (method === "id" ? "ring-2 ring-[var(--color-ink)]" : "")
          }
        >
          <span className="grid place-items-center h-9 w-9 rounded-full bg-[var(--color-sand)] text-[#6a5326]">
            <Camera size={16} />
          </span>
          <div className="flex-1">
            <p className="text-[14px] font-medium">Verify with ID + selfie</p>
            <p className="text-[12.5px] text-[var(--color-muted)]">
              Checked on device · auto-deleted after
            </p>
          </div>
        </button>
      </div>

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
