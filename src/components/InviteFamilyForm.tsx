"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function InviteFamilyForm({ ancestorId }: { ancestorId: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function invite() {
    setSending(true);
    setMessage("");
    const response = await fetch("/api/invites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ancestorId, email }),
    });

    setSending(false);
    setMessage(
      response.ok
        ? "Invite sent. They will receive a magic link to start talking."
        : "The invite could not be sent yet. Please check the email and try again.",
    );
  }

  return (
    <section className="rounded-lg border border-echo-cream/10 bg-white/[0.035] p-5">
      <h2 className="font-display text-3xl text-echo-gold">Share with family</h2>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          placeholder="cousin@example.com"
          className="min-w-0 flex-1 rounded-full border border-echo-cream/12 bg-black/20 px-4 py-3 text-echo-cream outline-none"
        />
        <button
          type="button"
          onClick={invite}
          disabled={sending || !email}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-echo-gold px-5 py-3 font-bold text-echo-ink disabled:opacity-50"
        >
          <Send size={17} /> Invite
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-echo-cream/68">{message}</p> : null}
    </section>
  );
}
