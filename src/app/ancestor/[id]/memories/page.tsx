import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera, MessageCircle, Mic2, PencilLine, Plus } from "lucide-react";
import { format } from "date-fns";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { Ancestor, MemorySource, MemorySourceType } from "@/types";

export const dynamic = "force-dynamic";

const icons: Record<MemorySourceType, typeof Mic2> = {
  audio_recording: Mic2,
  whatsapp_export: MessageCircle,
  letter_text: PencilLine,
  video_transcript: Camera,
  journal_entry: PencilLine,
  interview_response: Mic2,
};

export default async function MemoriesPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: ancestor }, { data: sources }] = await Promise.all([
    supabase
      .from("ancestors")
      .select("*")
      .eq("id", params.id)
      .eq("owner_id", user.id)
      .single(),
    supabase
      .from("memory_sources")
      .select("*")
      .eq("ancestor_id", params.id)
      .order("created_at", { ascending: true }),
  ]);

  if (!ancestor) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-echo-ink px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-sm text-echo-gold">
          Back to dashboard
        </Link>
        <header className="mt-6 flex flex-col justify-between gap-5 border-b border-echo-cream/10 pb-8 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-5xl text-echo-cream">
              {(ancestor as Ancestor).name} memories
            </h1>
            <p className="mt-3 text-echo-cream/65">
              Sources are shown in the order they entered the archive.
            </p>
          </div>
          <Link
            href={`/ancestor/${params.id}/add-memories`}
            className="inline-flex items-center gap-2 rounded-full bg-echo-gold px-5 py-3 font-bold text-echo-ink"
          >
            <Plus size={18} /> Add memories
          </Link>
        </header>

        {ancestor.persona_summary ? (
          <section className="mt-10 overflow-hidden rounded-lg border border-echo-gold/20 bg-[radial-gradient(circle_at_top_left,#1C1510,#0D0907)] shadow-2xl">
            <div className="border-b border-echo-gold/10 bg-echo-gold/5 px-8 py-4">
              <h2 className="font-display flex items-center gap-3 text-2xl text-echo-gold">
                <PencilLine size={20} /> Digital Persona Analysis
              </h2>
            </div>
            <div className="p-8">
              <div className="prose prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-lg italic leading-relaxed text-echo-cream/90">
                  &ldquo;{ancestor.persona_summary}&rdquo;
                </p>
              </div>
              <div className="mt-8 flex items-center gap-4 border-t border-echo-gold/10 pt-6 text-xs uppercase tracking-[0.25em] text-echo-gold/40">
                <span>Refined from {sources?.length ?? 0} memories</span>
                <span className="h-1 w-1 rounded-full bg-echo-gold/30" />
                <span>Ready for conversation</span>
              </div>
            </div>
          </section>
        ) : null}

        <section className="relative mt-12 space-y-12 border-l border-echo-gold/25 pl-7">
          {((sources ?? []) as MemorySource[]).map((source) => {
            const Icon = icons[source.type] ?? PencilLine;
            return (
              <article key={source.id} className="relative">
                <div className="absolute -left-[47px] grid h-10 w-10 place-items-center rounded-full border border-echo-gold/35 bg-echo-brown text-echo-gold">
                  <Icon size={18} />
                </div>
                <p className="text-sm uppercase tracking-[0.2em] text-echo-muted">
                  {format(new Date(source.created_at), "PPP")}
                </p>
                <p className="mt-3 line-clamp-6 text-echo-cream/70">
                  {source.processed_content ??
                    (source.raw_content?.startsWith("storage://")
                      ? "Queued for transcription and processing."
                      : source.raw_content)}
                </p>
                {source.raw_content?.startsWith("storage://memory-files/") &&
                (source.type === "audio_recording" ||
                  source.type === "video_transcript" ||
                  source.type === "interview_response") ? (
                  <div className="mt-4">
                    <AudioPlayer
                      path={source.raw_content.replace(
                        "storage://memory-files/",
                        "",
                      )}
                    />
                  </div>
                ) : null}
              </article>
            );
          })}
          {(sources ?? []).length === 0 ? (
            <p className="text-echo-cream/64">
              No memories have been processed yet.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

async function AudioPlayer({ path }: { path: string }) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.storage
    .from("memory-files")
    .createSignedUrl(path, 3600);

  if (!data?.signedUrl) return null;

  return (
    <audio
      controls
      className="h-10 w-full max-w-sm rounded-full opacity-60 transition-opacity hover:opacity-100"
      src={data.signedUrl}
    >
      Your browser does not support the audio element.
    </audio>
  );
}
