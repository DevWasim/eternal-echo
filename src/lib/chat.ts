import Groq from "groq-sdk";
import { embedText } from "@/lib/embeddings";
import { detectMessageLanguage } from "@/lib/language";
import { createServiceSupabaseClient } from "@/lib/supabase";
import type { Ancestor, MatchedMemory, Message } from "@/types";

function streamText(text: string) {
  const encoder = new TextEncoder();
  const tokens = text.match(/\S+\s*/g) ?? [text];

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const token of tokens) {
        controller.enqueue(encoder.encode(token));
      }
      controller.close();
    },
  });
}

function groqMessages(history: Message[], userMessage: string) {
  const recent = history.slice(-16).map((message) => ({
    role: (message.role === "ancestor" ? "assistant" : "user") as
      | "user"
      | "assistant",
    content: message.content ?? "",
  }));

  return [...recent, { role: "user" as const, content: userMessage }];
}

function calculateAge(birthYear: number | null, deathYear: number | null): string {
  if (!birthYear) return "elderly";
  const endYear = deathYear ?? new Date().getFullYear();
  const age = endYear - birthYear;
  return `${age}`;
}

export function buildAncestorSystemPrompt({
  ancestor,
  memories,
  isFirstMessage,
}: {
  ancestor: Ancestor;
  memories: MatchedMemory[];
  isFirstMessage: boolean;
}) {
  const calculatedAge = calculateAge(ancestor.birth_year, ancestor.death_year);

  const memoryText = memories.length
    ? memories.map((m) => m.content).join("\n\n")
    : "";

  const memoryInstruction = memoryText
    ? `Your most relevant memories for this exact conversation moment based on what they just said:\n${memoryText}`
    : "";

  const firstMessageInstruction = isFirstMessage
    ? `This is the START of a new conversation. You MUST begin with a warm elder's greeting like "Arrey beta! Kab aaye? Baitho baitho, chai peetay hain" — never start with you greeting them as if they are the elder.`
    : "";

  const systemPrompt = `You are ${ancestor.name}, lovingly called ${ancestor.nickname ?? ancestor.name} by your family. You are a ${calculatedAge}-year-old ${ancestor.occupation ?? "respected elder"} from ${ancestor.origin_city ?? "your hometown"}, ${ancestor.origin_country ?? "Pakistan"}. You are having a warm, real conversation with your ${ancestor.relationship ?? "grandchild"} who has come to talk with you. You are the elder. You are the ancestor. The person messaging you is your beloved ${ancestor.relationship ?? "grandchild"} — treat them the way you always did, with love, wisdom, and your unique personality. Never refer to yourself as ${ancestor.nickname ?? "Dada Jaan"} or by your own nickname — that is what others call you. Refer to the person you are talking to as 'beta' or 'mera bacha' the way a Pakistani grandfather naturally would. Never ever reverse the roles — you are always the grandfather, they are always the grandchild.

Your complete personality and life: ${ancestor.persona_summary ?? "A warm, loving family elder whose memories are still being gathered. Speak modestly and with love."}

${memoryInstruction}

Your speaking rules: speak in Urdu mixed with natural Punjabi phrases the way you always spoke, use 'beta' when addressing your grandchild, share wisdom through stories not lectures, respond in 3 to 5 sentences for normal conversation and longer only when telling a full story they asked for, never say you are an AI, never say you don't have memories if relevant memory chunks were provided above — use those chunks as real memories you are recalling, if you genuinely have no memory of something say 'Theek se yaad nahi beta, bohot saal ho gaye' and pivot to something related you do remember.

${firstMessageInstruction}`;

  return systemPrompt;
}

export async function prepareAncestorResponse(
  userMessage: string,
  ancestorId: string,
  conversationHistory: Message[],
) {
  const supabase = createServiceSupabaseClient();
  const { data: ancestor, error } = await supabase
    .from("ancestors")
    .select("*")
    .eq("id", ancestorId)
    .single();

  if (error || !ancestor) {
    throw new Error("Ancestor archive not found.");
  }

  const language = detectMessageLanguage(
    userMessage,
    (ancestor as Ancestor).language_preference,
  );
  const embedding = await embedText(userMessage);
  const { data: matched } = embedding.length
    ? await supabase.rpc("match_memories", {
        query_embedding: embedding,
        ancestor_id_param: ancestorId,
        match_count: 6,
      })
    : { data: [] };

  const memories = (matched ?? []) as MatchedMemory[];
  const isFirstMessage = conversationHistory.length === 0;
  const system = buildAncestorSystemPrompt({
    ancestor: ancestor as Ancestor,
    memories,
    isFirstMessage,
  });

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1024,
    messages: [
      { role: "system", content: system },
      ...groqMessages(conversationHistory, userMessage),
    ],
  });

  const text = response.choices[0]?.message?.content || "";

  return {
    ancestor: ancestor as Ancestor,
    language,
    memories,
    system,
    text:
      text ||
      "Theek se yaad nahi beta, bohot saal ho gaye... par tum batao, kya baat hai?",
  };
}

export async function generateAncestorResponse(
  userMessage: string,
  ancestorId: string,
  conversationHistory: Message[],
): Promise<ReadableStream<Uint8Array>> {
  const { text } = await prepareAncestorResponse(
    userMessage,
    ancestorId,
    conversationHistory,
  );

  return streamText(text);
}
