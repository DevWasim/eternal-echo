"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Missing invite token.");
      return;
    }
    fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          setStatus("Invite accepted! Redirecting...");
          setTimeout(() => {
            router.push(`/chat/${data.ancestorId}`);
          }, 2000);
        } else {
          setError(data.error || "Failed to accept invite.");
        }
      })
      .catch(() => setError("Failed to accept invite."));
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-echo-ink text-echo-cream">
      <div className="bg-[#18120b] rounded-xl p-8 shadow-lg max-w-md w-full text-center">
        <h1 className="text-2xl font-serif text-gold mb-4">Accept Family Invite</h1>
        {status && <div className="text-gold text-lg mb-2">{status}</div>}
        {error && <div className="text-red-400 text-lg mb-2">{error}</div>}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-echo-ink text-echo-cream">Loading...</div>}>
      <AcceptInviteContent />
    </Suspense>
  );
}
