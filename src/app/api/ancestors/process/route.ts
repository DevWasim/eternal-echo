import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { embedText } from "@/lib/embeddings";
import { buildPersonaSummary } from "@/lib/persona";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
} from "@/lib/supabase";
import { cloneVoice } from "@/lib/voice";
import { extractAncestorWhatsAppMessages } from "@/lib/whatsapp";
import type { Ancestor, MemorySource, MemorySourceType } from "@/types";

export const runtime = "nodejs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const storageFolders: Array<{
  folder: string;
  type: MemorySourceType | "voice_reference";
}> = [
  { folder: "audio_recording", type: "audio_recording" },
  { folder: "video_transcript", type: "video_transcript" },
  { folder: "letter_text", type: "letter_text" },
  { folder: "interview_response", type: "interview_response" },
  { folder: "voice_reference", type: "voice_reference" },
];

async function transcribeBlob(blob: Blob, filename: string) {
  // Groq's SDK supports passing a File object (which is a Blob with a name)
  const file = new File([await blob.arrayBuffer()], filename);
  
  const result = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3",
    response_format: "text",
  });

  return typeof result === "string" ? result : (result as any).text || "";
}

async function emitProgress(
  ancestorId: string,
  stage: string,
  detail: string,
  progress: number,
) {
  const supabase = createServiceSupabaseClient();
  await supabase.from("processing_events").insert({
    ancestor_id: ancestorId,
    stage,
    detail,
    progress,
  });
}

async function downloadStorageFile(path: string) {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.storage
    .from("memory-files")
    .download(path);

  if (error || !data) {
    throw new Error("Memory file could not be downloaded.");
  }

  return data;
}

async function ingestStorageFiles(ancestor: Ancestor) {
  const supabase = createServiceSupabaseClient();
  const createdSources: MemorySource[] = [];
  const voiceCandidates: Blob[] = [];

  for (const { folder, type } of storageFolders) {
    const { data: files } = await supabase.storage
      .from("memory-files")
      .list(`${ancestor.id}/${folder}`);

    for (const file of files ?? []) {
      if (!file.name || file.name.endsWith("/")) continue;
      const path = `${ancestor.id}/${folder}/${file.name}`;
      const storageUri = `storage://memory-files/${path}`;

      if (type !== "voice_reference") {
        const { data: existing } = await supabase
          .from("memory_sources")
          .select("id")
          .eq("ancestor_id", ancestor.id)
          .eq("raw_content", storageUri)
          .limit(1);

        if (existing?.length) continue;
      }

      const blob = await downloadStorageFile(path);

      if (type === "voice_reference") {
        voiceCandidates.push(blob);
        continue;
      }

      let processed = "";

      if (
        type === "audio_recording" ||
        type === "video_transcript" ||
        type === "interview_response"
      ) {
        processed = await transcribeBlob(blob, file.name);
      } else {
        processed = file.name.toLowerCase().endsWith(".txt")
          ? await blob.text()
          : "A PDF or document was uploaded. Add extracted text when available to enrich this source.";
      }

      const { data: source } = await supabase
        .from("memory_sources")
        .insert({
          ancestor_id: ancestor.id,
          type,
          raw_content: storageUri,
          processed_content: processed,
          language: ancestor.language_preference,
        })
        .select("*")
        .single();

      if (source) createdSources.push(source as MemorySource);
      if (type === "audio_recording" && blob.size > 0) {
        voiceCandidates.push(blob);
      }
    }
  }

  return { createdSources, voiceCandidates };
}

async function processTextSources(ancestor: Ancestor) {
  const supabase = createServiceSupabaseClient();
  const { data: sources } = await supabase
    .from("memory_sources")
    .select("*")
    .eq("ancestor_id", ancestor.id)
    .order("created_at", { ascending: true });

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 600,
    chunkOverlap: 80,
  });

  const processedTexts: string[] = [];

  for (const source of (sources ?? []) as MemorySource[]) {
    let content = source.processed_content ?? "";

    if (!content && source.type === "whatsapp_export" && source.raw_content) {
      content = extractAncestorWhatsAppMessages(source.raw_content, ancestor.name);
      await supabase
        .from("memory_sources")
        .update({ processed_content: content })
        .eq("id", source.id);
    } else if (!content && source.raw_content && !source.raw_content.startsWith("storage://")) {
      content = source.raw_content;
      await supabase
        .from("memory_sources")
        .update({ processed_content: content })
        .eq("id", source.id);
    }

    const clean = content.replace(/\s+/g, " ").trim();
    if (!clean) continue;

    processedTexts.push(clean);

    const { data: existingChunks } = await supabase
      .from("memory_chunks")
      .select("id")
      .eq("source_id", source.id)
      .limit(1);

    if (existingChunks?.length) continue;

    const chunks = await splitter.splitText(clean);

    for (const chunk of chunks) {
      const embedding = await embedText(chunk);
      await supabase.from("memory_chunks").insert({
        ancestor_id: ancestor.id,
        source_id: source.id,
        content: chunk,
        embedding,
        topic_tags: [],
        emotional_tone: null,
        time_period: null,
      });
    }
  }

  return processedTexts;
}

export async function POST(request: Request) {
  const { ancestorId } = (await request.json()) as {
    ancestorId?: string;
    mode?: "all" | "new_only";
  };

  if (!ancestorId) {
    return NextResponse.json(
      { error: "Please provide an ancestor ID." },
      { status: 400 },
    );
  }

  const routeClient = await createRouteSupabaseClient();
  const {
    data: { user },
  } = await routeClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceSupabaseClient();
  const { data: ancestor } = await supabase
    .from("ancestors")
    .select("*")
    .eq("id", ancestorId)
    .eq("owner_id", user.id)
    .single();

  if (!ancestor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await supabase
      .from("ancestors")
      .update({ status: "processing" })
      .eq("id", ancestorId);

    await emitProgress(
      ancestorId,
      "Transcribing memories...",
      "We are listening through recordings, videos, and voice notes.",
      18,
    );
    const { voiceCandidates } = await ingestStorageFiles(ancestor as Ancestor);

    await emitProgress(
      ancestorId,
      "Understanding personality...",
      "We are turning stories and messages into searchable memory fragments.",
      45,
    );
    const processedTexts = await processTextSources(ancestor as Ancestor);

    await emitProgress(
      ancestorId,
      "Building persona...",
      "We are distilling speaking style, values, love, worries, and family patterns.",
      68,
    );
    const personaSummary = await buildPersonaSummary(
      processedTexts.join("\n\n").slice(0, 320000),
      ancestor as Ancestor,
    );

    await emitProgress(
      ancestorId,
      "Cloning voice...",
      "We are preparing the closest respectful voice for conversations.",
      82,
    );

    let voiceCloneId = (ancestor as Ancestor).voice_clone_id;
    if (!voiceCloneId) {
      try {
        const candidate = voiceCandidates[0];
        if (candidate) {
          voiceCloneId = await cloneVoice(candidate, (ancestor as Ancestor).name);
        }
      } catch {
        voiceCloneId = null;
        await emitProgress(
          ancestorId,
          "Voice fallback selected",
          "The audio we have is a bit unclear, but we've prepared a warm alternative voice that captures their spirit.",
          88,
        );
      }
    }

    await supabase
      .from("ancestors")
      .update({
        persona_summary: personaSummary,
        voice_clone_id: voiceCloneId,
        status: "ready",
      })
      .eq("id", ancestorId);

    await emitProgress(
      ancestorId,
      "Almost done...",
      processedTexts.join(" ").length < 800
        ? "We've preserved what we have. Every memory you add makes the conversation richer."
        : "The ancestor archive is ready for the first conversation.",
      100,
    );

    return NextResponse.json({ ok: true });
  } catch {
    await supabase
      .from("ancestors")
      .update({ status: "draft" })
      .eq("id", ancestorId);
    await emitProgress(
      ancestorId,
      "Processing paused",
      "We preserved the uploaded memories, but processing needs another try.",
      0,
    );
    return NextResponse.json(
      {
        error:
          "We preserved what we could, but processing needs another try. Every memory you add makes the conversation richer.",
      },
      { status: 500 },
    );
  }
}
