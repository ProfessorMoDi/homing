// Defensive formatters for AI-returned time/duration strings, so the
// downstream UI shows a consistent format regardless of what the model wrote.

export function formatTime(raw: string | undefined | null): string {
  if (!raw) return "";
  const s = String(raw).trim();

  // 12-hour like "7:30 PM", "7 PM", "7:30PM"
  const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm|a\.m\.|p\.m\.)$/);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = ampm[2] ? parseInt(ampm[2], 10) : 0;
    const isPm = /p/i.test(ampm[3]);
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // European "19h30" / "19u30"
  const hr = s.match(/^(\d{1,2})\s*[hu]\s*(\d{2})$/i);
  if (hr) {
    return `${String(parseInt(hr[1], 10)).padStart(2, "0")}:${hr[2]}`;
  }

  // Extract first HH:MM-ish anywhere in the string (handles "19:30 hours",
  // "around 19:30", "19:30 (Thursday)" etc.)
  const m24 = s.match(/(\d{1,2}):(\d{2})/);
  if (m24) {
    const h = Math.min(23, parseInt(m24[1], 10));
    const m = Math.min(59, parseInt(m24[2], 10));
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // Bare integer like "20" → "20:00"
  const bare = s.match(/^(\d{1,2})$/);
  if (bare) {
    const h = Math.min(23, parseInt(bare[1], 10));
    return `${String(h).padStart(2, "0")}:00`;
  }

  return s;
}

export function parseDurationMinutes(raw: string | undefined | null): number {
  if (!raw) return 0;
  const r = String(raw).trim().toLowerCase();

  // "1h 30 min" or "1 hour 30 minutes"
  const hm = r.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)\s*(?:and\s*)?(\d+)\s*(?:m|min|mins|minute|minutes)/);
  if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);

  // "1.5 hours" / "2 hours" / "1 hour"
  const dec = r.match(/^([\d.]+)\s*(?:h|hr|hrs|hour|hours)$/);
  if (dec) return Math.round(parseFloat(dec[1]) * 60);

  // "90 minutes" / "30 min"
  const min = r.match(/^(\d+)\s*(?:m|min|mins|minute|minutes)$/);
  if (min) return parseInt(min[1], 10);

  // Loose: extract first decimal followed by "h" anywhere
  const looseH = r.match(/([\d.]+)\s*(?:h|hr|hour)/);
  if (looseH) return Math.round(parseFloat(looseH[1]) * 60);

  // Loose: minutes anywhere
  const looseM = r.match(/(\d+)\s*(?:m|min)/);
  if (looseM) return parseInt(looseM[1], 10);

  return 0;
}

export function formatDuration(raw: string | undefined | null): string {
  const mins = parseDurationMinutes(raw);
  if (mins <= 0) return raw ? String(raw) : "";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return h === 1 ? "1 hr" : `${h} hrs`;
  return `${h} hr ${m} min`;
}

export function formatDayTime(day: string, time: string): string {
  const t = formatTime(time);
  if (!day && !t) return "";
  if (!t) return day;
  if (!day) return t;
  return `${day} at ${t}`;
}

export function formatTimeRange(
  time: string,
  duration: string,
): string {
  const start = formatTime(time);
  const mins = parseDurationMinutes(duration);
  if (!start || mins <= 0) return start;
  const [sh, sm] = start.split(":").map((n) => parseInt(n, 10));
  const total = sh * 60 + sm + mins;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  const end = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  return `${start}–${end}`;
}
