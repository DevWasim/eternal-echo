import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prepareAncestorResponse } from "@/lib/chat";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
} from "@/lib/supabase";
import { synthesizeSpeech } from "@/lib/voice";
import { detectMessageLanguage } from "@/lib/language";
import type { Ancestor, Message } from "@/types";

export const runtime = "nodejs";

function sse(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

async function userCanAccessAncestor(
  ancestor: Ancestor,
  userId: string,
  email?: string,
) {
  if (ancestor.owner_id === userId) return true;

  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from("ancestor_invites")
    .select("id")
    .eq("ancestor_id", ancestor.id)
    .or(`accepted_by.eq.${userId},email.eq.${email ?? ""}`)
    .limit(1);

  return Boolean(data?.length);
}

export async function POST(request: Request) {
  const { ancestorId, message, conversationId } = (await request.json()) as {
    ancestorId?: string;
    message?: string;
    conversationId?: string;
  };

  if (!ancestorId || !message?.trim()) {
    return NextResponse.json(
      { error: "Please send a message and ancestor." },
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
    .single();

  if (!ancestor || !(await userCanAccessAncestor(ancestor as Ancestor, user.id, user.email))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let activeConversationId = conversationId;

  if (!activeConversationId) {
    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        ancestor_id: ancestorId,
        user_id: user.id,
        session_title: message.slice(0, 72),
      })
      .select("id")
      .single();

    if (error || !conversation) {
      return NextResponse.json(
        { error: "Conversation could not be started." },
        { status: 500 },
      );
    }

    activeConversationId = conversation.id;
  }

  const { data: previousMessages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", activeConversationId)
    .order("created_at", { ascending: true });

  await supabase.from("messages").insert({
    conversation_id: activeConversationId,
    role: "user",
    content: message,
  });

  let prepared: Awaited<ReturnType<typeof prepareAncestorResponse>>;

  try {
    prepared = await prepareAncestorResponse(
      message,
      ancestorId,
      (previousMessages ?? []) as Message[],
    );
  } catch (err) {
    console.error("[Chat] prepareAncestorResponse failed:", err);
    prepared = {
      ancestor: ancestor as Ancestor,
      language: detectMessageLanguage(
        message,
        (ancestor as Ancestor).language_preference,
      ),
      memories: [],
      system: "",
      text: "Theek se yaad nahi beta, bohot saal ho gaye... par tum batao, kya dil mein hai?",
    };
  }

  // Generate a temporary message ID for audio file naming
  const tempMessageId = uuidv4();
  const voiceCloneId = (ancestor as Ancestor).voice_clone_id;

  // Start voice synthesis with three-tier fallback (runs in parallel with streaming)
  const audioPromise = synthesizeSpeech(
    prepared.text,
    voiceCloneId,
    activeConversationId!,
    tempMessageId,
  ).catch((err) => {
    console.error("[Chat] All voice synthesis tiers failed:", err);
    return "";
  });

  const encoder = new TextEncoder();
  const tokens = prepared.text.match(/\S+\s*/g) ?? [prepared.text];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        encoder.encode(sse("meta", { conversationId: activeConversationId })),
      );

      for (const token of tokens) {
        controller.enqueue(encoder.encode(sse("token", { token })));
      }

      const audioUrl = await audioPromise;
      const { data: savedMessage } = await supabase
        .from("messages")
        .insert({
          conversation_id: activeConversationId,
          role: "ancestor",
          content: prepared.text,
          audio_url: audioUrl || null,
        })
        .select("*")
        .single();

      controller.enqueue(
        encoder.encode(
          sse("final", {
            conversationId: activeConversationId,
            messageId: savedMessage?.id,
            audioUrl,
          }),
        ),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
