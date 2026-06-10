import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ELEVENLABS_API_KEY on the server." },
      { status: 500 },
    );
  }

  const formData = await req.formData();
  const audio = formData.get("audio");
  const languageHint = formData.get("language_hint");
  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json(
      { error: "No audio file provided" },
      { status: 400 },
    );
  }

  const mime = audio.type || "audio/webm";
  const ext = mime.includes("mp4")
    ? "m4a"
    : mime.includes("ogg")
      ? "ogg"
      : mime.includes("wav")
        ? "wav"
        : "webm";

  const eleven = new FormData();
  eleven.append("file", audio, `recording.${ext}`);
  eleven.append("model_id", "scribe_v1");
  eleven.append("tag_audio_events", "false");
  eleven.append("diarize", "false");
  // Optional ISO language hint improves multilingual accuracy when known.
  if (typeof languageHint === "string" && languageHint.trim()) {
    eleven.append("language_code", languageHint.trim().slice(0, 8));
  }

  const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: eleven,
  });

  if (!r.ok) {
    const detail = await r.text();
    return NextResponse.json(
      { error: `ElevenLabs ${r.status}`, detail },
      { status: r.status },
    );
  }

  const data = (await r.json()) as { text?: string; language_code?: string };
  return NextResponse.json({
    text: data.text ?? "",
    language: data.language_code ?? null,
  });
}
