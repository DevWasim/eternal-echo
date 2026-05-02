"use client";

import { useRef, useState } from "react";
import { Mic, SendHorizontal, Volume2 } from "lucide-react";
import { ConversationStarters } from "@/components/ConversationStarters";
import type { Ancestor, Message } from "@/types";

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionFactory = new () => BrowserSpeechRecognition;

function parseEvent(chunk: string) {
  const eventLine = chunk
    .split("\n")
    .find((line) => line.startsWith("event: "));
  const dataLine = chunk
    .split("\n")
    .find((line) => line.startsWith("data: "));

  if (!eventLine || !dataLine) return null;

  return {
    event: eventLine.replace("event: ", ""),
    data: JSON.parse(dataLine.replace("data: ", "")) as Record<string, string>,
  };
}

export function ChatExperience({
  ancestor,
  initialMessages,
  initialConversationId,
}: {
  ancestor: Ancestor;
  initialMessages: Message[];
  initialConversationId?: string;
}) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function sendMessage(value = input) {
    const text = value.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    const draftId = `draft-${Date.now()}`;
    const now = new Date().toISOString();
    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        conversation_id: conversationId ?? "pending",
        role: "user",
        content: text,
        audio_url: null,
        created_at: now,
      },
      {
        id: draftId,
        conversation_id: conversationId ?? "pending",
        role: "ancestor",
        content: "",
        audio_url: null,
        created_at: now,
      },
    ]);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ancestorId: ancestor.id,
        conversationId,
        message: text,
      }),
    });

    if (!response.body) {
      setSending(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value: chunk, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(chunk, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const parsed = parseEvent(part);
        if (!parsed) continue;

        if (parsed.event === "meta" && parsed.data.conversationId) {
          setConversationId(parsed.data.conversationId);
        }

        if (parsed.event === "token") {
          setMessages((current) =>
            current.map((message) =>
              message.id === draftId
                ? {
                    ...message,
                    content: `${message.content ?? ""}${parsed.data.token}`,
                  }
                : message,
            ),
          );
        }

        if (parsed.event === "final") {
          setMessages((current) =>
            current.map((message) =>
              message.id === draftId
                ? {
                    ...message,
                    id: parsed.data.messageId ?? draftId,
                    audio_url: parsed.data.audioUrl ?? null,
                  }
                : message,
            ),
          );

          if (parsed.data.audioUrl) {
            const audio = new Audio(parsed.data.audioUrl);
            audioRef.current = audio;
            setSpeaking(true);
            audio.onended = () => setSpeaking(false);
            await audio.play().catch(() => setSpeaking(false));
          }
        }
      }
    }

    setSending(false);
  }

  async function playAudio(url: string, id: string) {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingId(id);
    audio.onended = () => setPlayingId(null);
    await audio.play().catch(() => setPlayingId(null));
  }

  function listen() {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionFactory;
      webkitSpeechRecognition?: SpeechRecognitionFactory;
    };
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = ancestor.language_preference === "ar" ? "ar-SA" : "ur-PK";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setInput(transcript);
    };
    recognition.onerror = () => setInput("");
    recognition.start();
  }

  return (
    <main className="flex min-h-screen flex-col bg-echo-ink text-echo-cream">
      <header className="flex items-center justify-between border-b border-echo-cream/10 px-6 py-5">
        <div>
          <h1 className="font-display text-4xl text-echo-gold">
            {ancestor.name}
          </h1>
          <p className="text-sm text-echo-cream/55">
            {ancestor.relationship ?? "Family elder"} ·{" "}
            {ancestor.origin_city ?? "Family archive"}
          </p>
        </div>
        <div className="flex h-14 items-end gap-1 rounded-full border border-echo-gold/20 bg-echo-gold/10 px-4 py-3">
          {[0, 150, 300, 450, 600].map((delay) => (
            <span
              key={delay}
              className={`h-8 w-1.5 rounded-full bg-echo-gold ${
                speaking || sending ? "wave-bar" : ""
              }`}
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-6">
        <ConversationStarters ancestor={ancestor} onPick={setInput} />
        <div className="mt-6 flex-1 space-y-5 overflow-y-auto pb-32">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "ancestor" ? (
                <div className="breathing-avatar mr-3 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-echo-gold/35 bg-echo-gold/12 font-display text-echo-gold">
                  {ancestor.name[0]}
                </div>
              ) : null}
              <div
                className={`max-w-[76%] rounded-2xl px-5 py-4 leading-7 ${
                  message.role === "user"
                    ? "bg-echo-cream text-echo-ink"
                    : "border border-echo-gold/20 bg-echo-gold/10 text-echo-cream"
                }`}
              >
                {message.content}
                {message.audio_url && message.role === "ancestor" ? (
                  <button
                    type="button"
                    onClick={() => playAudio(message.audio_url!, message.id)}
                    className={`mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      playingId === message.id
                        ? "text-echo-gold"
                        : "text-echo-gold/60 hover:text-echo-gold"
                    }`}
                  >
                    <Volume2
                      size={14}
                      className={playingId === message.id ? "animate-pulse" : ""}
                    />
                    {playingId === message.id ? "Playing..." : "Listen"}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-echo-cream/10 bg-echo-ink/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            type="button"
            onClick={listen}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-echo-gold/35 text-echo-gold"
            title="Voice input"
          >
            <Mic size={20} />
          </button>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void sendMessage();
            }}
            className="h-12 min-w-0 flex-1 rounded-full border border-echo-cream/12 bg-white/[0.04] px-5 text-echo-cream outline-none focus:border-echo-gold/60"
            placeholder={`Talk to ${ancestor.nickname ?? ancestor.name}...`}
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={sending || !input.trim()}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-echo-gold text-echo-ink disabled:opacity-45"
            title="Send"
          >
            <SendHorizontal size={20} />
          </button>
        </div>
      </footer>
    </main>
  );
}
