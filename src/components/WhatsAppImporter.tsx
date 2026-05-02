"use client";
import React, { useState } from "react";

interface WhatsAppImporterProps {
  ancestorName: string;
  ancestorId: string;
}

const PROGRESS_STATES = [
  { key: "reading", label: "Reading messages..." },
  { key: "finding", label: (name: string) => `Finding ${name}'s words...` },
  { key: "saving", label: "Saving memories..." },
  { key: "success", label: (count: number) => `${count} memories found and saved!` },
];

export default function WhatsAppImporter({ ancestorName, ancestorId }: WhatsAppImporterProps) {
  const [rawText, setRawText] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    setProgress("Reading messages...");
    setError(null);
    setSuccessCount(null);
    try {
      setProgress(`Finding ${ancestorName}'s words...`);
      setProgress("Saving memories...");
      const res = await fetch("/api/memories/parse-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, ancestorId, ancestorName }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessCount(data.chunksProcessed);
        setProgress(`${data.chunksProcessed} memories found and saved!`);
      } else {
        setError("No memories found or saved.");
        setProgress(null);
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
      setProgress(null);
    }
  }

  return (
    <div className="bg-[#18120b] rounded-xl p-6 max-w-2xl mx-auto shadow-lg text-cream">
      <h2 className="text-2xl font-serif mb-4 text-gold">Import WhatsApp Memories</h2>
      <textarea
        className="w-full h-48 p-4 rounded-lg bg-[#231a11] text-cream border border-gold/30 focus:border-gold focus:outline-none resize-vertical mb-4 text-base placeholder:text-gold/50"
        placeholder={
          "Paste your WhatsApp chat export here — open WhatsApp, go to the chat, tap More, Export Chat, Without Media, copy all the text and paste it here"
        }
        value={rawText}
        onChange={e => setRawText(e.target.value)}
        rows={12}
        minLength={20}
        required
        style={{ fontFamily: "DM Sans, sans-serif" }}
      />
      <button
        className="w-full py-3 rounded-lg bg-gold text-[#18120b] font-bold text-lg shadow transition hover:bg-[#e2c08d] disabled:opacity-50 min-h-[48px]"
        onClick={handleImport}
        disabled={!rawText || !!progress}
      >
        Parse & Import
      </button>
      {progress && (
        <div className="mt-6 flex flex-col items-center animate-pulse">
          <span className="text-lg text-gold font-semibold">{progress}</span>
        </div>
      )}
      {successCount !== null && (
        <div className="mt-6 text-center">
          <span className="text-xl text-gold font-bold">
            {successCount} of {ancestorName}&apos;s memories found and saved!
          </span>
        </div>
      )}
      {error && (
        <div className="mt-4 text-red-400 text-center">{error}</div>
      )}
    </div>
  );
}
