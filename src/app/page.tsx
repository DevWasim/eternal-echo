import Link from "next/link";
import { ArrowRight, BookOpen, Mic2, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-echo-ink text-echo-cream">
      <section className="relative flex min-h-[92vh] items-center">
        <div className="particle-field absolute inset-0 opacity-35" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(201,169,110,0.14),transparent_30%),linear-gradient(180deg,rgba(10,7,5,0.35),#0A0705_92%)]" />
        <nav className="absolute left-0 right-0 top-0 z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <span className="font-display text-3xl font-semibold text-echo-gold">
            Eternal Echo
          </span>
          <Link
            href="/login"
            className="rounded-full border border-echo-cream/15 px-5 py-2 text-sm text-echo-cream/80 transition hover:border-echo-gold/50 hover:text-echo-cream"
          >
            Sign in
          </Link>
        </nav>
        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-6 pt-20 lg:grid-cols-[1.04fr_0.72fr]">
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.35em] text-echo-gold/80">
              AI ancestor preservation
            </p>
            <h1 className="font-display max-w-5xl text-5xl font-semibold leading-[0.95] text-echo-cream sm:text-6xl lg:text-7xl">
              What would you give to hear their voice one more time?
            </h1>
            <p className="mt-8 max-w-3xl text-xl leading-9 text-echo-cream/76 sm:text-3xl sm:leading-[1.35]">
              Eternal Echo preserves the voice, wisdom, and stories of the
              people who shaped you so they can answer your questions for
              generations.
            </p>
            <Link
              href="/register"
              className="mt-10 inline-flex items-center gap-3 rounded-full bg-echo-gold px-7 py-4 text-base font-bold text-echo-ink transition hover:bg-[#D9BC83]"
            >
              Start Preserving <ArrowRight size={18} />
            </Link>
          </div>
          <div className="glass-panel mx-auto w-full max-w-[360px] rounded-[2rem] p-4">
            <div className="rounded-[1.5rem] border border-echo-cream/10 bg-[#120D0A] p-5">
              <div className="mb-6 flex items-center gap-3">
                <div className="breathing-avatar grid h-12 w-12 place-items-center rounded-full border border-echo-gold/30 bg-echo-gold/15 font-display text-xl text-echo-gold">
                  D
                </div>
                <div>
                  <p className="font-display text-2xl text-echo-cream">
                    Dada Jaan
                  </p>
                  <p className="text-xs text-echo-muted">Voice preserved</p>
                </div>
              </div>
              <div className="space-y-4 text-sm leading-6">
                <div className="ml-auto max-w-[82%] rounded-2xl bg-echo-cream px-4 py-3 text-echo-ink">
                  Dada, how do I know if I am ready for marriage?
                </div>
                <div className="max-w-[88%] rounded-2xl border border-echo-gold/20 bg-echo-gold/10 px-4 py-3 text-echo-cream">
                  Beta, nikah sirf khushi ka naam nahi, zimmedari ka naam hai.
                  Choose someone whose presence makes your deen and your heart
                  calmer. I still remember how your Dadi listened more than she
                  spoke, and that patience built our home.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-echo-cream/10 bg-[#100B08] px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {[
            ["Upload their recordings", Mic2],
            ["We train their AI voice and personality", Sparkles],
            ["Talk to them anytime, forever", BookOpen],
          ].map(([label, Icon]) => (
            <div key={label as string} className="flex gap-5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-echo-gold/12 text-echo-gold">
                <Icon size={22} />
              </div>
              <p className="font-display text-3xl leading-tight text-echo-cream">
                {label as string}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-4xl font-semibold text-echo-gold sm:text-6xl">
            We built Eternal Echo because every family deserves to keep their
            elders&apos; wisdom alive.
          </h2>
          <p className="mt-8 max-w-3xl text-xl leading-9 text-echo-cream/75">
            Their stories, their way of seeing the world, their specific love
            for you: not just photos and memories, but real conversations shaped
            by the voice notes, letters, journals, and values they left behind.
          </p>
        </div>
      </section>

      <section className="bg-[#120D0A] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-center text-5xl font-semibold">
            Pricing for families
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              ["Free", "$0", "1 ancestor, text only", "free"],
              ["Family", "$9/mo", "3 ancestors, voice enabled", "family"],
              [
                "Legacy",
                "$25/mo",
                "Unlimited ancestors, priority processing, PDF memory books",
                "legacy",
              ],
            ].map(([name, price, description, tier]) => (
              <form
                key={name}
                action="/api/stripe/checkout"
                method="POST"
                className="rounded-lg border border-echo-cream/10 bg-white/[0.035] p-7"
              >
                <input type="hidden" name="tier" value={tier} />
                <h3 className="font-display text-3xl text-echo-gold">{name}</h3>
                <p className="mt-3 text-4xl font-bold">{price}</p>
                <p className="mt-4 min-h-14 text-echo-cream/68">
                  {description}
                </p>
                <button
                  type="submit"
                  className="mt-8 w-full rounded-full bg-echo-cream px-5 py-3 font-bold text-echo-ink transition hover:bg-echo-gold"
                >
                  {tier === "free" ? "Start free" : "Choose plan"}
                </button>
              </form>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
