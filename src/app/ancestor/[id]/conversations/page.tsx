import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { MessageCircle } from "lucide-react";
import { InviteFamilyForm } from "@/components/InviteFamilyForm";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { Conversation } from "@/types";

export const dynamic = "force-dynamic";

export default async function ConversationsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .eq("ancestor_id", params.id)
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  return (
    <main className="min-h-screen bg-echo-ink px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-sm text-echo-gold">
          Back to dashboard
        </Link>
        <header className="mt-6 border-b border-echo-cream/10 pb-8">
          <h1 className="font-display text-5xl">Conversation history</h1>
          <p className="mt-3 text-echo-cream/65">
            Resume a previous session or start a new one.
          </p>
        </header>
        <div className="mt-8">
          <InviteFamilyForm ancestorId={params.id} />
        </div>
        <section className="mt-8 space-y-4">
          {((conversations ?? []) as Conversation[]).map((conversation) => (
            <Link
              href={`/chat/${params.id}?conversation=${conversation.id}`}
              key={conversation.id}
              className="flex items-center justify-between rounded-lg border border-echo-cream/10 bg-white/[0.035] p-5 transition hover:border-echo-gold/35"
            >
              <div>
                <h2 className="font-display text-2xl">
                  {conversation.session_title ?? "Family conversation"}
                </h2>
                <p className="mt-1 text-sm text-echo-muted">
                  {format(new Date(conversation.started_at), "PPP p")}
                </p>
              </div>
              <MessageCircle className="text-echo-gold" />
            </Link>
          ))}
          {(conversations ?? []).length === 0 ? (
            <p className="text-echo-cream/64">No conversations yet.</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
