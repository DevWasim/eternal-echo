"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Progress from "@radix-ui/react-progress";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileAudio,
  FileText,
  Mic2,
  UploadCloud,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";

const identitySchema = z.object({
  name: z.string().min(2, "Please enter their full name."),
  nickname: z.string().optional(),
  relationship: z.string().min(2, "Please describe your relationship."),
  birth_year: z.string().optional(),
  death_year: z.string().optional(),
  origin_city: z.string().optional(),
  origin_country: z.string().optional(),
  religion: z.string().optional(),
  language_preference: z.enum(["ur", "ar", "en"]),
});

type IdentityForm = z.infer<typeof identitySchema>;

type PersonalityData = {
  occupation: string;
  education: string;
  spouse_name: string;
  children_names: string;
  siblings_names: string;
  home_description: string;
  signature_phrases: string;
  fears_and_regrets: string;
  proudest_moments: string;
  daily_routines: string;
  food_preferences: string;
  political_views: string;
  religious_practices: string;
  sense_of_humor: string;
  relationship_with_money: string;
  advice_they_always_gave: string;
  topics_they_avoided: string;
  physical_mannerisms: string;
  nicknames_they_used_for_others: string;
};

const personalityQuestions: { key: keyof PersonalityData; question: string; placeholder: string; multiline?: boolean }[] = [
  { key: "occupation", question: "What did they do for a living?", placeholder: "e.g. Retired army officer, ran a cloth shop in Anarkali" },
  { key: "education", question: "What was their education like?", placeholder: "e.g. Studied at Government College Lahore, loved reading Iqbal" },
  { key: "spouse_name", question: "What was their spouse's name?", placeholder: "e.g. Naseem Akhtar" },
  { key: "children_names", question: "Name their children (one per line)", placeholder: "e.g. Tariq\nSaima\nFaisal", multiline: true },
  { key: "siblings_names", question: "Name their siblings (one per line)", placeholder: "e.g. Rashid Bhai\nZubaida Apa", multiline: true },
  { key: "home_description", question: "Describe their home — what did it feel like to walk in?", placeholder: "e.g. A big haveli with a courtyard, always smelled like parathas in the morning", multiline: true },
  { key: "signature_phrases", question: "Write some things they used to say often — their favourite phrases, warnings, or jokes (one per line)", placeholder: "e.g. Beta, waqt kisi ka intezar nahi karta\nPehle chai piyo, phir baat karo", multiline: true },
  { key: "fears_and_regrets", question: "What were their deepest fears or regrets, if they ever shared them?", placeholder: "e.g. Always regretted not finishing his degree, worried about the family after him", multiline: true },
  { key: "proudest_moments", question: "What were they most proud of in life?", placeholder: "e.g. When his son became a doctor, building the family house brick by brick", multiline: true },
  { key: "daily_routines", question: "Describe their typical day — morning to night, what did they always do?", placeholder: "e.g. Fajr prayer, then walked to the park, read the newspaper with chai, napped after Zuhr", multiline: true },
  { key: "food_preferences", question: "What food did they love? What did they refuse to eat?", placeholder: "e.g. Loved nihari on Sundays, hated karela, always asked for extra dahi" },
  { key: "religious_practices", question: "How did they practice their faith in daily life?", placeholder: "e.g. Never missed a prayer, always did dhikr on tasbeeh after Isha, gave sadqa every Friday" },
  { key: "sense_of_humor", question: "How did they make people laugh? What was their humor like?", placeholder: "e.g. Dry humor, would say something serious then wink, loved old Punjabi jokes" },
  { key: "relationship_with_money", question: "How did they handle money? Were they generous, careful, or somewhere in between?", placeholder: "e.g. Very careful with money but secretly generous — would slip notes into grandchildren's pockets" },
  { key: "advice_they_always_gave", question: "What advice did they repeat to everyone?", placeholder: "e.g. Always said 'Ilm haasil karo, zameen kharido, aur logon se izzat se pesh aao'", multiline: true },
  { key: "topics_they_avoided", question: "Were there topics they never talked about or got uncomfortable with?", placeholder: "e.g. Never talked about partition, changed subject when asked about his father" },
  { key: "physical_mannerisms", question: "How did they sit, gesture, or express themselves physically?", placeholder: "e.g. Always stroked his beard when thinking, sat cross-legged on the charpai, pointed with his whole hand" },
  { key: "nicknames_they_used_for_others", question: "What nicknames did they use for family members?", placeholder: "e.g. Called his wife 'Begum Sahiba', youngest grandchild 'Chhotu', eldest son 'Baray Miyan'" },
  { key: "political_views", question: "Did they have strong political views or opinions about the world?", placeholder: "e.g. Always listened to BBC Urdu, complained about politicians but voted every time" },
];

type ProgressEvent = {
  stage: string;
  detail: string | null;
  progress: number;
};

const steps = [
  "Identity",
  "Their personality",
  "Memory collection",
  "Voice setup",
  "Processing",
  "Ready",
];

function toOptionalNumber(value?: string) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeName(file: File) {
  return `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
}

function sourceTypeFor(file: File) {
  if (file.type.startsWith("audio/")) return "audio_recording";
  if (file.type.startsWith("video/")) return "video_transcript";
  return "letter_text";
}

export function AncestorWizard() {
  const router = useRouter();
  const { supabase, user } = useAuth();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [whatsAppText, setWhatsAppText] = useState("");
  const [ancestorId, setAncestorId] = useState<string | null>(null);
  const [personality, setPersonality] = useState<PersonalityData>({
    occupation: "", education: "", spouse_name: "", children_names: "",
    siblings_names: "", home_description: "", signature_phrases: "",
    fears_and_regrets: "", proudest_moments: "", daily_routines: "",
    food_preferences: "", political_views: "", religious_practices: "",
    sense_of_humor: "", relationship_with_money: "",
    advice_they_always_gave: "", topics_they_avoided: "",
    physical_mannerisms: "", nicknames_they_used_for_others: "",
  });
  const [event, setEvent] = useState<ProgressEvent>({
    stage: "Waiting",
    detail: "Your archive is ready to begin processing.",
    progress: 0,
  });
  const [message, setMessage] = useState("");

  const form = useForm<IdentityForm>({
    resolver: zodResolver(identitySchema),
    defaultValues: {
      name: "",
      nickname: "",
      relationship: "",
      birth_year: "",
      death_year: "",
      origin_city: "",
      origin_country: "Pakistan",
      religion: "Islam",
      language_preference: "ur",
    },
  });

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((current) => [...current, ...accepted]);
  }, []);

  const memoryDropzone = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "audio/*": [".mp3", ".m4a", ".wav", ".ogg", ".webm"],
      "video/*": [".mp4", ".mov"],
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
    },
  });

  const voiceDropzone = useDropzone({
    onDrop: (accepted) => setVoiceFile(accepted[0] ?? null),
    multiple: false,
    accept: {
      "audio/*": [".mp3", ".m4a", ".wav", ".ogg", ".webm"],
    },
  });

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  useEffect(() => {
    if (!ancestorId || step !== 4) return;

    const channel = supabase
      .channel(`processing-events-${ancestorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "processing_events",
          filter: `ancestor_id=eq.${ancestorId}`,
        },
        (payload) => {
          const next = payload.new as ProgressEvent;
          setEvent(next);
          if (next.progress >= 100) {
            setStep(5);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ancestorId, step, supabase]);

  async function createAncestor() {
    if (!user) {
      setMessage("Please sign in again before creating this archive.");
      return;
    }

    const valid = await form.trigger();
    if (!valid) return;

    setMessage("");
    const values = form.getValues();
    console.log("Submitting Ancestor Data:", {
      owner_id: user.id,
      ...values,
      personality
    });

    function splitLines(text: string): string[] | null {
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      return lines.length > 0 ? lines : null;
    }

    const { data: ancestor, error } = await supabase
      .from("ancestors")
      .insert({
        owner_id: user.id,
        name: values.name,
        nickname: values.nickname || null,
        relationship: values.relationship,
        birth_year: toOptionalNumber(values.birth_year),
        death_year: toOptionalNumber(values.death_year),
        origin_city: values.origin_city || null,
        origin_country: values.origin_country || null,
        religion: values.religion || null,
        language_preference: values.language_preference,
        status: "draft",
        occupation: personality.occupation || null,
        education: personality.education || null,
        spouse_name: personality.spouse_name || null,
        children_names: splitLines(personality.children_names),
        siblings_names: splitLines(personality.siblings_names),
        home_description: personality.home_description || null,
        signature_phrases: splitLines(personality.signature_phrases),
        fears_and_regrets: personality.fears_and_regrets || null,
        proudest_moments: personality.proudest_moments || null,
        daily_routines: personality.daily_routines || null,
        food_preferences: personality.food_preferences || null,
        political_views: personality.political_views || null,
        religious_practices: personality.religious_practices || null,
        sense_of_humor: personality.sense_of_humor || null,
        relationship_with_money: personality.relationship_with_money || null,
        advice_they_always_gave: personality.advice_they_always_gave || null,
        topics_they_avoided: personality.topics_they_avoided || null,
        physical_mannerisms: personality.physical_mannerisms || null,
        nicknames_they_used_for_others: personality.nicknames_they_used_for_others || null,
      })
      .select("*")
      .single();

    if (error || !ancestor) {
      console.error("Supabase Insert Error:", error);
      setMessage(
        `We could not create the archive yet: ${error?.message || "Please check your connection and try again."}`,
      );
      return;
    }

    setAncestorId(ancestor.id);

    for (const file of files) {
      const type = sourceTypeFor(file);
      const { error: uploadError } = await supabase.storage
        .from("memory-files")
        .upload(`${ancestor.id}/${type}/${safeName(file)}`, file, {
          upsert: false,
        });

      if (uploadError) {
        setMessage(
          "One memory could not be uploaded. The archive will continue with the files that arrived safely.",
        );
      }
    }

    if (voiceFile) {
      await supabase.storage
        .from("memory-files")
        .upload(`${ancestor.id}/voice_reference/${safeName(voiceFile)}`, voiceFile, {
          upsert: false,
        });
    }

    if (whatsAppText.trim()) {
      await supabase.from("memory_sources").insert({
        ancestor_id: ancestor.id,
        type: "whatsapp_export",
        raw_content: whatsAppText,
        language: values.language_preference,
      });
    }

    setStep(4);
    setEvent({
      stage: "Preparing memories",
      detail: "We are gathering the files and written memories you provided.",
      progress: 8,
    });

    const response = await fetch("/api/ancestors/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ancestorId: ancestor.id }),
    });

    if (!response.ok) {
      setMessage(
        "We preserved what we could, but processing needs another try. Every memory you add makes the conversation richer.",
      );
      return;
    }

    setStep(5);
    router.refresh();
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-sm text-echo-cream/65">
          <span>{steps[step]}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress.Root className="h-2 overflow-hidden rounded-full bg-echo-cream/10">
          <Progress.Indicator
            className="h-full bg-echo-gold transition-all"
            style={{ width: `${progress}%` }}
          />
        </Progress.Root>
      </div>

      <AnimatePresence mode="wait">
        {step === 0 ? (
          <motion.div
            key="identity"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="glass-panel rounded-lg p-7"
          >
            <h1 className="font-display text-5xl text-echo-gold">
              Who are we preserving?
            </h1>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {[
                ["Full name", "name", "Muhammad Yousuf Khan"],
                ["What you called them", "nickname", "Dada, Nana, Abu"],
                ["Relationship", "relationship", "Grandfather"],
                ["Birth year", "birth_year", "1942"],
                ["Death year", "death_year", "Leave blank if living"],
                ["City of origin", "origin_city", "Lahore"],
                ["Country of origin", "origin_country", "Pakistan"],
                ["Religion", "religion", "Islam"],
              ].map(([label, name, placeholder]) => (
                <label key={name} className="block">
                  <span className="mb-2 block text-sm text-echo-cream/70">
                    {label}
                  </span>
                  <input
                    {...form.register(name as keyof IdentityForm)}
                    placeholder={placeholder}
                    className={`w-full rounded-md border bg-black/20 px-4 py-3 text-echo-cream outline-none transition-colors focus:border-echo-gold/60 ${
                      form.formState.errors[name as keyof IdentityForm]
                        ? "border-[#F1A29A]"
                        : "border-echo-cream/12"
                    }`}
                  />
                  {form.formState.errors[name as keyof IdentityForm] ? (
                    <p className="mt-1.5 text-xs text-[#F1A29A]">
                      {form.formState.errors[name as keyof IdentityForm]?.message}
                    </p>
                  ) : null}
                </label>
              ))}
              <label className="block">
                <span className="mb-2 block text-sm text-echo-cream/70">
                  Primary language
                </span>
                <select
                  {...form.register("language_preference")}
                  className="w-full rounded-md border border-echo-cream/12 bg-black/20 px-4 py-3 text-echo-cream outline-none focus:border-echo-gold/60"
                >
                  <option value="ur">Urdu</option>
                  <option value="ar">Arabic</option>
                  <option value="en">English</option>
                </select>
              </label>
            </div>

          </motion.div>
        ) : null}

        {step === 1 ? (
          <motion.div
            key="personality"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="glass-panel rounded-lg p-7"
          >
            <h1 className="font-display text-5xl text-echo-gold">
              Tell us who they really were
            </h1>
            <p className="mt-3 text-echo-cream/60">
              Every detail makes the conversation more real. All fields are optional — share what you remember.
            </p>
            <div className="mt-8 grid gap-6">
              {personalityQuestions.map(({ key, question, placeholder, multiline }) => (
                <label key={key} className="block">
                  <span className="mb-2 block text-sm font-medium text-echo-cream/80">
                    {question}
                  </span>
                  {multiline ? (
                    <textarea
                      value={personality[key]}
                      onChange={(e) => setPersonality((p) => ({ ...p, [key]: e.target.value }))}
                      rows={3}
                      placeholder={placeholder}
                      className="w-full rounded-md border border-echo-cream/12 bg-black/20 px-4 py-3 text-echo-cream placeholder:text-echo-cream/30 outline-none transition-colors focus:border-echo-gold/60"
                    />
                  ) : (
                    <input
                      value={personality[key]}
                      onChange={(e) => setPersonality((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full rounded-md border border-echo-cream/12 bg-black/20 px-4 py-3 text-echo-cream placeholder:text-echo-cream/30 outline-none transition-colors focus:border-echo-gold/60"
                    />
                  )}
                </label>
              ))}
            </div>
          </motion.div>
        ) : null}

        {step === 2 ? (
          <motion.div
            key="memories"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="glass-panel rounded-lg p-7"
          >
            <h1 className="font-display text-5xl text-echo-gold">
              Memory collection hub
            </h1>
            <div
              {...memoryDropzone.getRootProps()}
              className="mt-8 rounded-lg border border-dashed border-echo-gold/45 bg-black/20 p-10 text-center"
            >
              <input {...memoryDropzone.getInputProps()} />
              <UploadCloud className="mx-auto text-echo-gold" size={34} />
              <p className="mt-4 text-lg text-echo-cream">
                Drop audio, WhatsApp voice notes, videos, text files, or PDFs.
              </p>
              <p className="mt-2 text-sm text-echo-cream/58">
                Supports mp3, m4a, wav, ogg, webm, mp4, mov, txt, and pdf.
              </p>
            </div>
            {files.length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {files.map((file) => (
                  <div
                    key={`${file.name}-${file.size}`}
                    className="flex items-center gap-3 rounded-md border border-echo-cream/10 bg-white/[0.035] p-3"
                  >
                    {file.type.startsWith("audio") ? (
                      <FileAudio className="text-echo-gold" />
                    ) : (
                      <FileText className="text-echo-gold" />
                    )}
                    <span className="truncate text-sm text-echo-cream/78">
                      {file.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <label className="mt-8 block">
              <span className="mb-2 block text-sm text-echo-cream/70">
                Paste WhatsApp chat export text
              </span>
              <textarea
                value={whatsAppText}
                onChange={(event) => setWhatsAppText(event.target.value)}
                rows={8}
                className="w-full rounded-md border border-echo-cream/12 bg-black/20 px-4 py-3 text-echo-cream outline-none focus:border-echo-gold/60"
                placeholder="12/03/2020, 18:22 - Dada: Beta, remember..."
              />
            </label>
          </motion.div>
        ) : null}

        {step === 3 ? (
          <motion.div
            key="voice"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="glass-panel rounded-lg p-7"
          >
            <h1 className="font-display text-5xl text-echo-gold">
              Voice setup
            </h1>
            <div
              {...voiceDropzone.getRootProps()}
              className="mt-8 rounded-lg border border-dashed border-echo-gold/45 bg-black/20 p-10 text-center"
            >
              <input {...voiceDropzone.getInputProps()} />
              <Mic2 className="mx-auto text-echo-gold" size={34} />
              <p className="mt-4 text-lg">
                Upload at least one minute of clear speech if you have it.
              </p>
              <p className="mt-2 text-sm text-echo-cream/60">
                If no recording exists, Eternal Echo will choose a respectful
                multilingual fallback voice while preserving the personality and
                memories you provide.
              </p>
            </div>
            {voiceFile ? (
              <p className="mt-4 rounded-md bg-echo-gold/10 px-4 py-3 text-sm text-echo-gold">
                Voice reference selected: {voiceFile.name}
              </p>
            ) : null}
            <div className="mt-6 rounded-md border border-echo-cream/10 bg-white/[0.035] p-5 text-sm leading-7 text-echo-cream/72">
              For proactive preservation, ask the elder to read in their own
              language: a childhood memory, a prayer or saying they use often,
              advice for grandchildren, and a story that makes them smile.
            </div>
          </motion.div>
        ) : null}

        {step === 4 ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="glass-panel rounded-lg p-10 text-center"
          >
            <div className="mx-auto mb-8 flex h-24 w-24 items-end justify-center gap-2 rounded-full border border-echo-gold/25 bg-echo-gold/10 p-5">
              {[0, 150, 300, 450].map((delay) => (
                <span
                  key={delay}
                  className="wave-bar h-12 w-2 rounded-full bg-echo-gold"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
            <h1 className="font-display text-5xl text-echo-gold">
              {event.stage}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-echo-cream/70">
              {event.detail ??
                "We are transcribing memories, understanding personality, and preparing voice."}
            </p>
            <Progress.Root className="mx-auto mt-8 h-2 max-w-md overflow-hidden rounded-full bg-echo-cream/10">
              <Progress.Indicator
                className="h-full bg-echo-gold transition-all"
                style={{ width: `${event.progress}%` }}
              />
            </Progress.Root>
          </motion.div>
        ) : null}

        {step === 5 ? (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="glass-panel rounded-lg p-10 text-center"
          >
            <CheckCircle2 className="mx-auto text-echo-gold" size={56} />
            <h1 className="font-display mt-6 text-5xl text-echo-gold">
              They are ready to talk
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-echo-cream/70">
              We&apos;ve preserved what we have. Every memory you add makes the
              conversation richer.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => ancestorId && router.push(`/chat/${ancestorId}`)}
                className="rounded-full bg-echo-gold px-6 py-3 font-bold text-echo-ink"
              >
                Start conversation
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="rounded-full border border-echo-cream/15 px-6 py-3 font-semibold text-echo-cream"
              >
                Return to dashboard
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {message ? <p className="mt-5 text-sm text-[#F1A29A]">{message}</p> : null}

      {step < 4 ? (
        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-2 rounded-full border border-echo-cream/15 px-5 py-3 text-echo-cream disabled:opacity-30"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <button
            type="button"
            onClick={async () => {
              if (step === 0) {
                const valid = await form.trigger();
                if (!valid) return;
              }

              if (step === 3) {
                await createAncestor();
                return;
              }

              setStep((current) => current + 1);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-echo-gold px-5 py-3 font-bold text-echo-ink"
          >
            {step === 3 ? "Begin processing" : "Continue"}{" "}
            <ArrowRight size={18} />
          </button>
        </div>
      ) : null}
    </section>
  );
}
