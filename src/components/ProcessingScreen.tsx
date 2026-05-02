"use client";
import React, { useEffect, useState, useRef } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface ProcessingScreenProps {
  ancestorId: string;
  ancestorName: string;
}

const PROCESSING_STAGES = [
  {
    key: "uploading",
    label: "Receiving your memories",
    sublabel: "Storing everything safely...",
    durationEstimate: 5,
  },
  {
    key: "transcribing",
    label: "Listening to their voice",
    sublabel: "Converting recordings to text...",
    durationEstimate: 30,
  },
  {
    key: "understanding",
    label: "Learning who they were",
    sublabel: "Reading every memory carefully...",
    durationEstimate: 20,
  },
  {
    key: "persona",
    label: "Building their personality",
    sublabel: "Understanding how they thought and spoke...",
    durationEstimate: 15,
  },
  {
    key: "voice",
    label: "Cloning their voice",
    sublabel: "Capturing how they sounded...",
    durationEstimate: 25,
  },
];

const QUOTES = [
  "Every 2 minutes of recording adds dozens of new memories your family can ask about.",
  "Voice cloning needs just 60 seconds of clear speech to capture someone's unique sound.",
  "The more letters and messages you add, the more accurately they speak.",
];

export default function ProcessingScreen({ ancestorId, ancestorName }: ProcessingScreenProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [status, setStatus] = useState(PROCESSING_STAGES[0].key);
  const [celebrate, setCelebrate] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Subscribe to ancestor status updates
    const channel = supabase
      .channel("ancestor-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ancestors",
          filter: `id=eq.${ancestorId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          const idx = PROCESSING_STAGES.findIndex((s) => s.key === newStatus);
          if (idx !== -1) {
            setCurrentStage(idx);
            setStatus(newStatus);
          }
          if (newStatus === "ready") {
            setCelebrate(true);
            setTimeout(() => {
              setCelebrate(false);
              router.push(`/chat/${ancestorId}`);
            }, 3000);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ancestorId, router, supabase]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setQuoteIdx((q) => (q + 1) % QUOTES.length);
    }, 8000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const timeRemaining = PROCESSING_STAGES.slice(currentStage + 1).reduce((acc, s) => acc + s.durationEstimate, 0);

  return (
    <div className="fixed inset-0 bg-[#18120b] flex flex-col items-center justify-center z-50 min-h-screen">
      <AnimatePresence>
        {celebrate ? (
          <motion.div
            key="celebrate"
            initial={{ scale: 1, boxShadow: "0 0 0 0 #c9a96e" }}
            animate={{ scale: 1.2, boxShadow: "0 0 80px 40px #c9a96e55" }}
            exit={{ scale: 1, boxShadow: "0 0 0 0 #c9a96e" }}
            transition={{ duration: 2 }}
            className="mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-serif text-gold text-center drop-shadow-lg">
              {ancestorName}
            </h1>
          </motion.div>
        ) : (
          <h1 className="text-3xl md:text-4xl font-serif text-gold mb-8 text-center">
            {ancestorName}
          </h1>
        )}
      </AnimatePresence>
      <div className="flex flex-col gap-8 w-full max-w-md">
        <ol className="relative border-l-2 border-gold/30 ml-6">
          {PROCESSING_STAGES.map((stage, idx) => (
            <li key={stage.key} className="mb-8 ml-4 flex items-center">
              {idx < currentStage ? (
                <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="#c9a96e" />
                  <path stroke="#18120b" strokeWidth="2" d="M8 12l2 2 4-4" />
                </svg>
              ) : idx === currentStage ? (
                <span className="w-6 h-6 flex items-center justify-center">
                  <span className="block w-6 h-6 border-4 border-gold border-t-transparent rounded-full animate-spin" />
                </span>
              ) : (
                <span className="w-6 h-6 rounded-full border-2 border-gold/30 bg-[#231a11]" />
              )}
              <div className="ml-4">
                <div className="text-lg md:text-xl font-semibold text-gold">{stage.label}</div>
                <div className="text-sm text-cream/70">{stage.sublabel}</div>
              </div>
            </li>
          ))}
        </ol>
        <div className="text-center text-gold text-lg mt-2">
          Estimated time remaining: {timeRemaining} seconds
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={quoteIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center text-cream/80 text-base mt-8"
          >
            <span className="italic">Did you know?</span> {QUOTES[quoteIdx]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
