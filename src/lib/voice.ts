import { v4 as uuidv4 } from "uuid";
import { createServiceSupabaseClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function uploadAudioToSupabase(
  audioBuffer: ArrayBuffer | Buffer,
  conversationId: string,
  messageId: string,
): Promise<string> {
  const supabase = createServiceSupabaseClient();
  const path = `conversations/${conversationId}/${messageId}.mp3`;
  const { error } = await supabase.storage
    .from("conversation-audio")
    .upload(path, audioBuffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from("conversation-audio")
    .getPublicUrl(path);

  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Tier 1: Fish Audio TTS (with optional voice cloning)
// ---------------------------------------------------------------------------

async function cloneVoiceWithFishAudio(
  audioBlob: Blob,
  ancestorName: string,
): Promise<string> {
  const fishKey = process.env.FISH_AUDIO_API_KEY;
  if (!fishKey) throw new Error("FISH_AUDIO_API_KEY is missing.");

  const form = new FormData();
  form.append("title", ancestorName);
  form.append("train_mode", "fast");
  form.append("visibility", "private");
  form.append(
    "voices",
    audioBlob,
    `${ancestorName.replace(/\s+/g, "-")}.mp3`,
  );

  const response = await fetch("https://api.fish.audio/v1/model", {
    method: "POST",
    headers: { Authorization: `Bearer ${fishKey}` },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Fish Audio clone failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as { _id?: string };
  if (!payload._id) throw new Error("Fish Audio did not return a model _id.");
  return payload._id;
}

async function fishAudioTTS(
  text: string,
  voiceCloneId: string,
): Promise<ArrayBuffer> {
  const fishKey = process.env.FISH_AUDIO_API_KEY;
  if (!fishKey) throw new Error("FISH_AUDIO_API_KEY is missing.");

  const response = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${fishKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      reference_id: voiceCloneId,
      format: "mp3",
      latency: "normal",
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Fish Audio TTS failed: ${response.status} ${body}`);
  }

  return response.arrayBuffer();
}

// ---------------------------------------------------------------------------
// Tier 2: Groq PlayAI TTS
// ---------------------------------------------------------------------------

async function groqPlayAITTS(text: string): Promise<ArrayBuffer> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("GROQ_API_KEY is missing.");

  const response = await fetch(
    "https://api.groq.com/openai/v1/audio/speech",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "playai-tts",
        input: text,
        voice: "Mamaw-PlayAI",
        response_format: "mp3",
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Groq PlayAI TTS failed: ${response.status} ${body}`);
  }

  return response.arrayBuffer();
}

// ---------------------------------------------------------------------------
// Tier 3: Google Cloud TTS
// ---------------------------------------------------------------------------

async function googleCloudTTS(text: string): Promise<ArrayBuffer> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is missing.");

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: "ur-PK",
          name: "ur-PK-Standard-B",
          ssmlGender: "MALE",
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: 0.85,
          pitch: -3.0,
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Google Cloud TTS failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as { audioContent?: string };
  if (!payload.audioContent) {
    throw new Error("Google Cloud TTS returned no audioContent.");
  }

  // Google returns base64-encoded audio
  const binaryString = atob(payload.audioContent);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// ---------------------------------------------------------------------------
// Public API: Three-Tier Fallback Voice Synthesis
// ---------------------------------------------------------------------------

/**
 * Clone a voice using Fish Audio. Returns the new voice clone ID.
 * Call this during ancestor processing when a voice reference file is provided.
 */
export async function cloneVoice(
  audioBlob: Blob,
  ancestorName: string,
): Promise<string> {
  return cloneVoiceWithFishAudio(audioBlob, ancestorName);
}

/**
 * Synthesize speech with three-tier fallback:
 *   1. Fish Audio (if voice_clone_id exists)
 *   2. Groq PlayAI TTS
 *   3. Google Cloud TTS
 *
 * Saves the resulting MP3 to Supabase Storage and returns the public URL.
 */
export async function synthesizeSpeech(
  text: string,
  voiceCloneId: string | null,
  conversationId: string,
  messageId: string,
): Promise<string> {
  let audioBuffer: ArrayBuffer | null = null;

  // Tier 1: Fish Audio with cloned voice
  if (voiceCloneId && process.env.FISH_AUDIO_API_KEY) {
    try {
      audioBuffer = await fishAudioTTS(text, voiceCloneId);
      console.log("[Voice] Fish Audio TTS succeeded.");
    } catch (err) {
      console.warn("[Voice] Fish Audio TTS failed, falling back:", err);
    }
  }

  // Tier 2: Groq PlayAI TTS
  if (!audioBuffer) {
    try {
      audioBuffer = await groqPlayAITTS(text);
      console.log("[Voice] Groq PlayAI TTS succeeded.");
    } catch (err) {
      console.warn("[Voice] Groq PlayAI TTS failed, falling back:", err);
    }
  }

  // Tier 3: Google Cloud TTS
  if (!audioBuffer) {
    try {
      audioBuffer = await googleCloudTTS(text);
      console.log("[Voice] Google Cloud TTS succeeded.");
    } catch (err) {
      console.error("[Voice] All TTS tiers failed:", err);
      return "";
    }
  }

  // Upload to Supabase Storage
  try {
    const url = await uploadAudioToSupabase(
      audioBuffer,
      conversationId,
      messageId,
    );
    return url;
  } catch (err) {
    console.error("[Voice] Failed to upload audio to Supabase:", err);
    return "";
  }
}

/**
 * Legacy compatibility — generates a unique ID for the audio file path
 * when a real messageId is not yet known.
 */
export async function synthesizeSpeechLegacy(
  text: string,
  voiceCloneId: string | null,
): Promise<string> {
  return synthesizeSpeech(text, voiceCloneId, "generated", uuidv4());
}
