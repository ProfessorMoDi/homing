"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell, StepDots } from "@/components/AppShell";
import { Label, PrimaryButton } from "@/components/Bits";
import { useApp } from "@/lib/store";

export default function SignUp() {
  const { state, setSignup } = useApp();
  const router = useRouter();
  const s = state.signup;
  const [showAgeWarn, setShowAgeWarn] = useState(false);
  const [password, setPassword] = useState("");

  const ageNum = s.age ?? 0;
  const tooYoung = s.age !== null && ageNum > 0 && ageNum < 18;
  const tooOld = s.age !== null && ageNum > 29;

  const canContinue =
    !!s.first_name &&
    /@(student\.)?eur\.nl$/i.test(s.email) &&
    password.length >= 6 &&
    ageNum >= 18 &&
    ageNum <= 29;

  function onContinue() {
    if (tooYoung || tooOld) {
      setShowAgeWarn(true);
      return;
    }
    router.push("/signup/details");
  }

  return (
    <AppShell back="/" title="Create your account">
      <div className="mb-5">
        <StepDots total={2} current={0} />
        <p className="text-[12px] text-[var(--color-muted)] text-center mt-2">
          Step 1 of 2 · the basics
        </p>
      </div>

      <h1 className="display text-[24px] mb-1">Register</h1>
      <p className="text-[13.5px] text-[var(--color-muted)] mb-6">
        EUR pilot · ages 18–29.
      </p>

      <div className="grid gap-3 mb-6">
        <div>
          <Label>EUR email</Label>
          <input
            className="field"
            placeholder="you@eur.nl"
            value={s.email}
            onChange={(e) => setSignup({ email: e.target.value })}
            autoComplete="email"
          />
        </div>
        <div>
          <Label>Password</Label>
          <input
            type="password"
            className="field"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>First name</Label>
            <input
              className="field"
              placeholder="Maxine"
              value={s.first_name}
              onChange={(e) => setSignup({ first_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Age</Label>
            <input
              inputMode="numeric"
              className="field"
              placeholder="23"
              value={s.age ?? ""}
              onChange={(e) =>
                setSignup({
                  age: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
        </div>
        {showAgeWarn && (tooYoung || tooOld) && (
          <div className="card-outline p-3 text-[13px] text-[var(--color-ink-soft)] border-[var(--color-clay)]">
            HOMING is currently piloting for 18–29 only. A younger track would
            need separate safeguarding.
          </div>
        )}
      </div>

      <PrimaryButton onClick={onContinue} disabled={!canContinue}>
        Continue
      </PrimaryButton>
      <p className="text-[12px] text-[var(--color-muted)] text-center mt-3">
        A few details next, then a two-minute voice prompt.
      </p>
    </AppShell>
  );
}
