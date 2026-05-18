"use client";

import { useRouter } from "next/navigation";
import { AppShell, Section, StepDots } from "@/components/AppShell";
import { ChipToggle, Label, PrimaryButton } from "@/components/Bits";
import { useApp } from "@/lib/store";

const GENDER = [
  ["male", "Male"],
  ["female", "Female"],
  ["non-binary", "Non-binary"],
  ["prefer-not-to-say", "Prefer not to say"],
] as const;

const GROUP_PREF = [
  ["same-gender", "Same-gender groups only"],
  ["mixed", "Mixed groups"],
  ["either", "No preference"],
] as const;

const LANGS = ["English", "Dutch", "German", "French", "Spanish", "Arabic"];

const AVAIL = [
  ["every-weekend", "Every weekend"],
  ["weekday-evenings", "Weekday evenings"],
  ["thursday-evening", "Thursday evening"],
  ["friday-morning", "Friday morning until 15:00"],
  ["flexible", "Flexible"],
  ["custom", "Custom availability"],
] as const;

const COMMIT = [
  ["try-once", "Try it once"],
  ["maybe-weekly", "Maybe weekly"],
  ["regular-thing", "Looking for a regular thing"],
  ["open-ended", "Open-ended"],
] as const;

const POSTCODE_RE = /^\d{4}\s?[A-Za-z]{2}$/;

export default function SignUpDetails() {
  const { state, setSignup } = useApp();
  const router = useRouter();
  const s = state.signup;

  const toggleArr = (arr: string[], key: string) =>
    arr.includes(key) ? arr.filter((x) => x !== key) : [...arr, key];

  const otherSelected =
    s.languages_spoken.includes("Other") ||
    s.languages_comfortable.includes("Other");

  const postcodeValid = !s.postcode || POSTCODE_RE.test(s.postcode.trim());

  const canContinue =
    !!s.gender &&
    !!s.gender_pref &&
    !!s.postcode &&
    postcodeValid &&
    s.languages_spoken.length > 0 &&
    s.languages_comfortable.length > 0 &&
    (!otherSelected || s.language_other.trim().length > 0) &&
    s.availability.length > 0 &&
    !!s.commitment;

  function onContinue() {
    router.push("/voice");
  }

  return (
    <AppShell back="/signup" title="A few details">
      <div className="mb-5">
        <StepDots total={2} current={1} />
        <p className="text-[12px] text-[var(--color-muted)] text-center mt-2">
          Step 2 of 2 · helps HOMING suggest the right activities
        </p>
      </div>

      <Section title="Identity">
        <Label>Gender identity</Label>
        <div className="seg mb-4">
          {GENDER.map(([k, v]) => (
            <ChipToggle
              key={k}
              label={v}
              selected={s.gender === k}
              onToggle={() => setSignup({ gender: k })}
            />
          ))}
        </div>
        <Label>Group gender preference</Label>
        <div className="seg">
          {GROUP_PREF.map(([k, v]) => (
            <ChipToggle
              key={k}
              label={v}
              selected={s.gender_pref === k}
              onToggle={() => setSignup({ gender_pref: k })}
            />
          ))}
        </div>
      </Section>

      <Section title="Where you are">
        <Label>Postcode</Label>
        <input
          className="field"
          placeholder="3062 PA"
          maxLength={7}
          value={s.postcode}
          onChange={(e) =>
            setSignup({ postcode: e.target.value.toUpperCase() })
          }
        />
        {!postcodeValid && s.postcode.length > 0 && (
          <p className="text-[12px] text-[var(--color-clay)] mt-1.5">
            Use a Dutch postcode, like 3062 PA.
          </p>
        )}
        <p className="text-[12px] text-[var(--color-muted)] mt-1.5">
          Used to lightly bias toward activities near you.
        </p>
      </Section>

      <Section title="Languages">
        <Label>Languages you speak</Label>
        <div className="seg mb-3">
          {[...LANGS, "Other"].map((l) => (
            <ChipToggle
              key={"s-" + l}
              label={l}
              selected={s.languages_spoken.includes(l)}
              onToggle={() =>
                setSignup({
                  languages_spoken: toggleArr(s.languages_spoken, l),
                })
              }
            />
          ))}
        </div>
        <Label>Languages comfortable using in a group</Label>
        <div className="seg mb-3">
          {[...LANGS, "Other"].map((l) => (
            <ChipToggle
              key={"c-" + l}
              label={l}
              selected={s.languages_comfortable.includes(l)}
              onToggle={() =>
                setSignup({
                  languages_comfortable: toggleArr(
                    s.languages_comfortable,
                    l,
                  ),
                })
              }
            />
          ))}
        </div>
        {otherSelected && (
          <>
            <Label>Add your language</Label>
            <input
              className="field"
              placeholder="e.g. Turkish, Italian, Portuguese"
              value={s.language_other}
              onChange={(e) => setSignup({ language_other: e.target.value })}
            />
          </>
        )}
      </Section>

      <Section title="When you're usually around">
        <Label>Availability</Label>
        <div className="seg">
          {AVAIL.map(([k, v]) => (
            <ChipToggle
              key={k}
              label={v}
              selected={s.availability.includes(k)}
              onToggle={() =>
                setSignup({ availability: toggleArr(s.availability, k) })
              }
            />
          ))}
        </div>
      </Section>

      <Section title="Activity rhythm">
        <Label>Commitment appetite</Label>
        <div className="seg">
          {COMMIT.map(([k, v]) => (
            <ChipToggle
              key={k}
              label={v}
              selected={s.commitment === k}
              onToggle={() => setSignup({ commitment: k })}
            />
          ))}
        </div>
      </Section>

      <PrimaryButton onClick={onContinue} disabled={!canContinue}>
        Continue to voice onboarding
      </PrimaryButton>
      <p className="text-[12px] text-[var(--color-muted)] text-center mt-3">
        You control what is used.
      </p>
    </AppShell>
  );
}
