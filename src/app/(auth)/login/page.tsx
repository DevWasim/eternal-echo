"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Mail, LockKeyhole, Globe2 } from "lucide-react";
import { FloatingFamilyTree } from "@/components/FloatingFamilyTree";
import { getAppUrl } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";

function LoginContent() {
  const { supabase } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError("We could not sign you in. Please check your email and password.");
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function googleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-echo-ink px-6 py-12">
      <FloatingFamilyTree />
      <section className="glass-panel relative z-10 w-full max-w-md rounded-lg p-8">
        <div className="text-center">
          <h1 className="font-display text-5xl font-semibold text-echo-gold">
            Eternal Echo
          </h1>
          <p className="mt-3 text-lg text-echo-cream/72">
            Preserve their voice. Forever.
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-echo-cream/70">Email</span>
            <span className="flex items-center gap-3 rounded-md border border-echo-cream/12 bg-black/20 px-4 py-3">
              <Mail size={18} className="text-echo-gold" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-transparent text-echo-cream outline-none placeholder:text-echo-muted"
                placeholder="you@example.com"
                type="email"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-echo-cream/70">
              Password
            </span>
            <span className="flex items-center gap-3 rounded-md border border-echo-cream/12 bg-black/20 px-4 py-3">
              <LockKeyhole size={18} className="text-echo-gold" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent text-echo-cream outline-none placeholder:text-echo-muted"
                placeholder="••••••••"
                type="password"
              />
            </span>
          </label>
        </div>
        {error ? <p className="mt-4 text-sm text-[#F1A29A]">{error}</p> : null}
        <button
          type="button"
          onClick={login}
          disabled={loading}
          className="mt-6 w-full rounded-full bg-echo-gold px-5 py-3 font-bold text-echo-ink transition hover:bg-[#D7BA82] disabled:opacity-60"
        >
          {loading ? "Opening your archive..." : "Sign in"}
        </button>
        <button
          type="button"
          onClick={googleLogin}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-echo-cream/15 px-5 py-3 font-semibold text-echo-cream transition hover:border-echo-gold/50"
        >
          <Globe2 size={18} /> Continue with Google
        </button>
        <p className="mt-6 text-center text-sm text-echo-cream/65">
          New to Eternal Echo?{" "}
          <Link href="/register" className="font-semibold text-echo-gold">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-echo-ink text-echo-cream">
          <p className="font-display text-3xl text-echo-gold">Eternal Echo</p>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
