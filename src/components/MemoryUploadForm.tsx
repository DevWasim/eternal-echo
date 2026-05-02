"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { FileAudio, FileText, UploadCloud } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";

function sourceTypeFor(file: File) {
  if (file.type.startsWith("audio/")) return "audio_recording";
  if (file.type.startsWith("video/")) return "video_transcript";
  return "letter_text";
}

function safeName(file: File) {
  return `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
}

export function MemoryUploadForm({ ancestorId }: { ancestorId: string }) {
  const router = useRouter();
  const { supabase } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((current) => [...current, ...accepted]);
  }, []);

  const dropzone = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".m4a", ".wav", ".ogg", ".webm"],
      "video/*": [".mp4", ".mov"],
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
    },
  });

  async function upload() {
    setUploading(true);
    setStatus("");

    for (const file of files) {
      const { error } = await supabase.storage
        .from("memory-files")
        .upload(
          `${ancestorId}/${sourceTypeFor(file)}/${safeName(file)}`,
          file,
          { upsert: false },
        );

      if (error) {
        setStatus(
          "One file could not be uploaded, but the rest of the memory update will continue.",
        );
      }
    }

    if (text.trim()) {
      await supabase.from("memory_sources").insert({
        ancestor_id: ancestorId,
        type: "journal_entry",
        raw_content: text,
      });
    }

    await fetch("/api/ancestors/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ancestorId, mode: "new_only" }),
    });

    setUploading(false);
    setStatus("New memories are being folded into the archive.");
    router.refresh();
  }

  return (
    <section className="glass-panel rounded-lg p-7">
      <div
        {...dropzone.getRootProps()}
        className="rounded-lg border border-dashed border-echo-gold/45 bg-black/20 p-10 text-center"
      >
        <input {...dropzone.getInputProps()} />
        <UploadCloud className="mx-auto text-echo-gold" size={34} />
        <p className="mt-4 text-lg">Drop newly discovered recordings or files.</p>
      </div>
      {files.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {files.map((file) => (
            <div
              key={`${file.name}-${file.size}`}
              className="flex items-center gap-3 rounded-md border border-echo-cream/10 bg-white/[0.035] p-3"
            >
              {file.type.startsWith("audio") ? (
                <FileAudio className="text-echo-gold" />
              ) : (
                <FileText className="text-echo-gold" />
              )}
              <span className="truncate text-sm text-echo-cream/78">
                {file.name}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={8}
        className="mt-6 w-full rounded-md border border-echo-cream/12 bg-black/20 px-4 py-3 text-echo-cream outline-none"
        placeholder="Write a new story, letter, or family memory here."
      />
      {status ? <p className="mt-4 text-sm text-echo-cream/70">{status}</p> : null}
      <button
        type="button"
        onClick={upload}
        disabled={uploading}
        className="mt-6 rounded-full bg-echo-gold px-6 py-3 font-bold text-echo-ink disabled:opacity-60"
      >
        {uploading ? "Adding memories..." : "Add memories"}
      </button>
    </section>
  );
}
