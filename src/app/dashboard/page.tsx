import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, MessageCircle, Clock3 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { Ancestor } from "@/types";

export const dynamic = "force-dynamic";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function years(ancestor: Ancestor) {
  if (!ancestor.birth_year && !ancestor.death_year) return "Years not set";
  if (ancestor.birth_year && ancestor.death_year) {
    return `${ancestor.birth_year} - ${ancestor.death_year}`;
  }
  if (ancestor.birth_year) return `Born ${ancestor.birth_year}`;
  return `Until ${ancestor.death_year}`;
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("ancestors")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const ancestors = (data ?? []) as Ancestor[];

  return (
    <main className="min-h-screen bg-echo-ink px-6 py-8 text-echo-cream">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-6 border-b border-echo-cream/10 pb-8 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-echo-gold">
              Family archive
            </p>
            <h1 className="font-display mt-3 text-5xl font-semibold">
              Your ancestors
            </h1>
          </div>
          <Link
            href="/dashboard/new-ancestor"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-echo-gold px-5 py-3 font-bold text-echo-ink transition hover:bg-[#D9BC83]"
          >
            <Plus size={18} /> Add ancestor
          </Link>
        </header>

        {ancestors.length === 0 ? (
          <section className="mt-16 rounded-lg border border-echo-cream/10 bg-white/[0.035] p-10 text-center">
            <h2 className="font-display text-4xl text-echo-gold">
              Begin with one voice, one letter, one story.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-echo-cream/70">
              Add an elder you want to preserve. You can start with very little
              and keep enriching the memory archive over time.
            </p>
            <Link
              href="/dashboard/new-ancestor"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-echo-cream px-5 py-3 font-bold text-echo-ink"
            >
              Create the first archive <Plus size={18} />
            </Link>
          </section>
        ) : (
          <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ancestors.map((ancestor) => (
              <article
                key={ancestor.id}
                className="rounded-lg border border-echo-cream/10 bg-white/[0.035] p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-echo-gold/30 bg-[radial-gradient(circle,#6B5234,#231611)] font-display text-3xl text-echo-gold sepia">
                    {initials(ancestor.name)}
                  </div>
                  <StatusBadge status={ancestor.status} />
                </div>
                <h2 className="font-display mt-6 text-4xl text-echo-cream">
                  {ancestor.name}
                </h2>
                <p className="mt-2 text-echo-cream/62">
                  {ancestor.relationship ?? "Family elder"} · {years(ancestor)}
                </p>
                <p className="mt-1 text-sm text-echo-muted">
                  {ancestor.origin_city ?? "Origin city"} ·{" "}
                  {ancestor.language_preference?.toUpperCase() ?? "UR"}
                </p>
                <div className="mt-7 grid gap-3">
                  <Link
                    href={`/chat/${ancestor.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-echo-gold px-4 py-3 font-bold text-echo-ink transition hover:bg-[#D9BC83]"
                  >
                    <MessageCircle size={18} /> Talk to {ancestor.nickname ?? ancestor.name}
                  </Link>
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href={`/ancestor/${ancestor.id}/memories`}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-echo-cream/12 px-4 py-2 text-sm text-echo-cream/75 transition hover:border-echo-gold/40"
                    >
                      <Clock3 size={15} /> Memories
                    </Link>
                    <Link
                      href={`/ancestor/${ancestor.id}/add-memories`}
                      className="inline-flex items-center justify-center rounded-full border border-echo-cream/12 px-4 py-2 text-sm text-echo-cream/75 transition hover:border-echo-gold/40"
                    >
                      Add more
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
