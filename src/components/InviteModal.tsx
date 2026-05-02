"use client";
import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { createBrowserSupabaseClient } from "@/lib/supabase";

interface InviteModalProps {
  ancestorId: string;
  ancestorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_LABELS: Record<string, string> = {
  viewer: "Can Chat",
  contributor: "Can Chat + Add Memories",
};

export default function InviteModal({ ancestorId, ancestorName, open, onOpenChange }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "contributor">("viewer");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    if (open) fetchInvites();
    // eslint-disable-next-line
  }, [open]);

  async function fetchInvites() {
    const { data } = await (supabase as any)
      .from("family_invites")
      .select("id, invitee_email, role, accepted_at, expires_at")
      .eq("ancestor_id", ancestorId)
      .order("created_at", { ascending: false });
    setInvites(data || []);
  }

  async function sendInvite() {
    setSending(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/invites/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ancestorId, inviteeEmail: email, role }),
    });
    const data = await res.json();
    setSending(false);
    if (data.success) {
      setSuccess(`Invitation sent to ${email} — they will receive a link to start talking with ${ancestorName}`);
      setEmail("");
      fetchInvites();
    } else {
      setError(data.error || "Failed to send invite.");
    }
  }

  async function revokeInvite(id: string) {
    await (supabase as any).from("family_invites").delete().eq("id", id);
    fetchInvites();
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg mx-4 bg-[#18120b] rounded-xl p-8 shadow-lg">
          <Dialog.Title className="text-2xl font-serif text-gold mb-4">Invite Family to {ancestorName}</Dialog.Title>
          <div className="flex flex-col gap-4 mb-6">
            <input
              type="email"
              className="w-full rounded-lg border border-gold/30 bg-[#231a11] p-3 text-cream text-base min-h-[48px]"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              minLength={5}
            />
            <div className="flex gap-2">
              {Object.entries(ROLE_LABELS).map(([val, label]) => (
                <button
                  key={val}
                  className={`flex-1 rounded-lg py-2 px-4 font-bold min-h-[48px] ${role === val ? "bg-gold text-[#18120b]" : "bg-[#231a11] text-gold border border-gold/30"}`}
                  onClick={() => setRole(val as "viewer" | "contributor")}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              className="w-full py-3 rounded-lg bg-gold text-[#18120b] font-bold text-lg shadow transition hover:bg-[#e2c08d] disabled:opacity-50 min-h-[48px]"
              onClick={sendInvite}
              disabled={sending || !email}
            >
              Send Invite
            </button>
            {success && <div className="text-gold text-center mt-2">{success}</div>}
            {error && <div className="text-red-400 text-center mt-2">{error}</div>}
          </div>
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gold mb-2">Existing Invites</h3>
            <ul className="space-y-2">
              {invites.map((invite) => (
                <li key={invite.id} className="flex items-center justify-between bg-[#231a11] rounded p-3">
                  <div>
                    <div className="text-cream font-medium">{invite.invitee_email}</div>
                    <div className="text-gold text-xs">{ROLE_LABELS[invite.role]}</div>
                    <div className="text-xs text-cream/60">
                      {invite.accepted_at ? "Accepted" : "Pending"}
                      {invite.expires_at && !invite.accepted_at && (
                        <> (expires {new Date(invite.expires_at).toLocaleDateString()})</>
                      )}
                    </div>
                  </div>
                  <button
                    className="ml-4 px-3 py-1 rounded bg-red-500/80 text-white text-xs font-bold min-h-[32px]"
                    onClick={() => revokeInvite(invite.id)}
                  >
                    Revoke
                  </button>
                </li>
              ))}
              {invites.length === 0 && (
                <li className="text-cream/60 text-sm">No invites yet.</li>
              )}
            </ul>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
