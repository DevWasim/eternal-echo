"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { Pause, Play, Save, Square } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";

const LiveAudioVisualizer = dynamic(
  () => import("react-audio-visualize").then((mod) => mod.LiveAudioVisualizer),
  { ssr: false },
);

const prompts = [
  "Tell me about the day you got married.",
  "What was the hardest thing you ever overcame?",
  "What do you want your grandchildren to know about you?",
  "What prayer, saying, or piece of advice has carried you through life?",
];

export function RecorderStudio({ ancestorId }: { ancestorId: string }) {
  const { supabase } = useAuth();
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [status, setStatus] = useState("");
  const chunks = useRef<Blob[]>([]);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunks.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      setAudioBlob(blob);
      stream.getTracks().forEach((track) => track.stop());
    };
    recorder.start();
    setMediaRecorder(recorder);
    setRecording(true);
  }

  function stop() {
    mediaRecorder?.stop();
    setRecording(false);
  }

  async function save() {
    if (!audioBlob) return;
    setStatus("Saving this answer to the family archive...");
    const path = `${ancestorId}/interview_response/${Date.now()}-answer.webm`;
    const { error } = await supabase.storage
      .from("memory-files")
      .upload(path, audioBlob, { contentType: "audio/webm", upsert: false });

    if (error) {
      setStatus("The recording did not save. Please try once more.");
      return;
    }

    await fetch("/api/ancestors/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ancestorId, mode: "new_only" }),
    });

    setStatus("Saved. This answer is queued for transcription.");
    setAudioBlob(null);
    setPromptIndex((current) => (current + 1) % prompts.length);
  }

  return (
    <section className="glass-panel rounded-lg p-7">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-echo-gold">
        Interview prompt
      </p>
      <h2 className="font-display mt-3 text-4xl text-echo-cream">
        {prompts[promptIndex]}
      </h2>

      <div className="mt-8 rounded-lg border border-echo-cream/10 bg-black/20 p-5">
        {mediaRecorder && recording ? (
          <LiveAudioVisualizer
            mediaRecorder={mediaRecorder}
            width={680}
            height={120}
            barColor="#C9A96E"
            backgroundColor="transparent"
          />
        ) : (
          <div className="flex h-[120px] items-end justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((bar) => (
              <span
                key={bar}
                className="h-12 w-2 rounded-full bg-echo-gold/45"
                style={{ height: `${24 + bar * 9}px` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {!recording ? (
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-2 rounded-full bg-echo-gold px-5 py-3 font-bold text-echo-ink"
          >
            <Play size={18} /> Record
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-2 rounded-full bg-echo-cream px-5 py-3 font-bold text-echo-ink"
          >
            <Square size={18} /> Stop
          </button>
        )}
        <button
          type="button"
          onClick={() => setPromptIndex((current) => (current + 1) % prompts.length)}
          className="inline-flex items-center gap-2 rounded-full border border-echo-cream/15 px-5 py-3 font-semibold text-echo-cream"
        >
          <Pause size={18} /> Skip prompt
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!audioBlob}
          className="inline-flex items-center gap-2 rounded-full border border-echo-gold/45 px-5 py-3 font-semibold text-echo-gold disabled:opacity-40"
        >
          <Save size={18} /> Save answer
        </button>
      </div>
      {status ? <p className="mt-4 text-sm text-echo-cream/70">{status}</p> : null}
    </section>
  );
}
