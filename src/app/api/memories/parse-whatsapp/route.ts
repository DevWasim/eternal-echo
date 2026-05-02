import { NextRequest, NextResponse } from "next/server";
import { parseWhatsAppExport } from "@/lib/whatsappParser";
import { createServiceSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { rawText, ancestorId, ancestorName } = await req.json();
  if (!rawText || !ancestorId || !ancestorName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const memories = parseWhatsAppExport(rawText, ancestorName);
  if (!memories.length) {
    return NextResponse.json({ success: false, chunksProcessed: 0 });
  }
  const supabase = createServiceSupabaseClient();
  let chunksProcessed = 0;
  for (const chunk of memories) {
    // Gemini Embeddings API
    const embeddingRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text: chunk.content }] },
        }),
      }
    );
    if (!embeddingRes.ok) continue;
    const embeddingData = await embeddingRes.json();
    const vector = embeddingData.embedding?.values;
    if (!vector) continue;
    // Insert into Supabase
    const { error } = await (supabase.from("memory_chunks") as any).insert({
      ancestor_id: ancestorId,
      source_id: null,
      content: chunk.content,
      embedding: vector,
      topic_tags: ["whatsapp"],
      type: "whatsapp_message",
      timestamp: chunk.timestamp,
    });
    if (!error) chunksProcessed++;
  }
  return NextResponse.json({ success: true, chunksProcessed });
}
