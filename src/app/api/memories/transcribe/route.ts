import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { path, ancestorId } = await req.json();
  if (!path || !ancestorId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const supabase = createServiceSupabaseClient();
  // Download file from Supabase Storage
  const { data, error } = await supabase.storage.from("memory-files").download(path);
  if (error || !data) {
    return NextResponse.json({ error: "Failed to download audio file." }, { status: 500 });
  }
  // Prepare formData for Whisper
  const formData = new FormData();
  formData.append("file", data, "audio.webm");
  formData.append("model", "whisper-large-v3");
  formData.append("response_format", "text");
  formData.append("language", "ur");
  // Send to Groq Whisper endpoint
  const whisperRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: formData,
  });
  if (!whisperRes.ok) {
    return NextResponse.json({ error: "Transcription failed." }, { status: 500 });
  }
  const transcript = await whisperRes.text();
  // Gemini Embeddings
  const embeddingRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text: transcript }] },
      }),
    }
  );
  if (!embeddingRes.ok) {
    return NextResponse.json({ error: "Embedding failed." }, { status: 500 });
  }
  const embeddingData = await embeddingRes.json();
  const vector = embeddingData.embedding?.values;
  if (!vector) {
    return NextResponse.json({ error: "No embedding returned." }, { status: 500 });
  }
  // Insert into memory_sources and memory_chunks
  const { error: srcErr, data: srcData } = await supabase
    .from("memory_sources")
    .insert({
      ancestor_id: ancestorId,
      type: "audio_recording",
      path,
      transcript,
    })
    .select()
    .single();
  if (srcErr || !srcData) {
    return NextResponse.json({ error: "Failed to insert memory source." }, { status: 500 });
  }
  const { error: chunkErr } = await supabase.from("memory_chunks").insert({
    ancestor_id: ancestorId,
    source_id: srcData.id,
    content: transcript,
    embedding: vector,
    topic_tags: ["audio_recording"],
    type: "audio_recording",
  });
  if (chunkErr) {
    return NextResponse.json({ error: "Failed to insert memory chunk." }, { status: 500 });
  }
  return NextResponse.json({ transcript });
}
