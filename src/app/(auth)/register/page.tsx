"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Globe2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { FloatingFamilyTree } from "@/components/FloatingFamilyTree";
import { getAppUrl } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";

export default function RegisterPage() {
  const { supabase } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function register() {
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${getAppUrl()}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        full_name: fullName,
      });
    }

    setLoading(false);
    setMessage("Your account is ready. Redirecting to your dashboard...");
    router.push("/dashboard");
    router.refresh();
  }

  async function googleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getAppUrl()}/auth/callback`,
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
            Begin a family archive that can speak back.
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-echo-cream/70">
              Full name
            </span>
            <span className="flex items-center gap-3 rounded-md border border-echo-cream/12 bg-black/20 px-4 py-3">
              <UserRound size={18} className="text-echo-gold" />
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full bg-transparent text-echo-cream outline-none"
                placeholder="Ayesha Khan"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-echo-cream/70">Email</span>
            <span className="flex items-center gap-3 rounded-md border border-echo-cream/12 bg-black/20 px-4 py-3">
              <Mail size={18} className="text-echo-gold" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-transparent text-echo-cream outline-none"
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
                className="w-full bg-transparent text-echo-cream outline-none"
                placeholder="At least 8 characters"
                type="password"
              />
            </span>
          </label>
        </div>
        {message ? (
          <p className="mt-4 text-sm text-echo-cream/75">{message}</p>
        ) : null}
        <button
          type="button"
          onClick={register}
          disabled={loading}
          className="mt-6 w-full rounded-full bg-echo-gold px-5 py-3 font-bold text-echo-ink transition hover:bg-[#D7BA82] disabled:opacity-60"
        >
          {loading ? "Creating your archive..." : "Create account"}
        </button>
        <button
          type="button"
          onClick={googleLogin}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-echo-cream/15 px-5 py-3 font-semibold text-echo-cream transition hover:border-echo-gold/50"
        >
          <Globe2 size={18} /> Continue with Google
        </button>
        <p className="mt-6 text-center text-sm text-echo-cream/65">
          Already preserving memories?{" "}
          <Link href="/login" className="font-semibold text-echo-gold">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
