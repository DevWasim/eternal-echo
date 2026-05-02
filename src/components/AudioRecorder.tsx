"use client";
import React, { useRef, useReducer, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { createBrowserSupabaseClient } from "@/lib/supabase";

interface AudioRecorderProps {
  ancestorId: string;
  onTranscription?: (transcript: string) => void;
}

type State = {
  status: "idle" | "recording" | "paused" | "stopped" | "uploading" | "done" | "error";
  duration: number;
  error: string | null;
  audioUrl: string | null;
  transcript: string | null;
};

type Action =
  | { type: "START" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "STOP" }
  | { type: "TICK" }
  | { type: "RESET" }
  | { type: "UPLOADING" }
  | { type: "DONE"; url: string; transcript: string }
  | { type: "ERROR"; error: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "START":
      return { ...state, status: "recording", duration: 0, error: null, audioUrl: null, transcript: null };
    case "PAUSE":
      return { ...state, status: "paused" };
    case "RESUME":
      return { ...state, status: "recording" };
    case "STOP":
      return { ...state, status: "stopped" };
    case "TICK":
      return { ...state, duration: state.duration + 1 };
    case "UPLOADING":
      return { ...state, status: "uploading" };
    case "DONE":
      return { ...state, status: "done", audioUrl: action.url, transcript: action.transcript };
    case "RESET":
      return { status: "idle", duration: 0, error: null, audioUrl: null, transcript: null };
    case "ERROR":
      return { ...state, error: action.error, status: "idle" };
    default:
      return state;
  }
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function AudioRecorder({ ancestorId, onTranscription }: AudioRecorderProps) {
  const [state, dispatch] = useReducer(reducer, {
    status: "idle",
    duration: 0,
    error: null,
    audioUrl: null,
    transcript: null,
  });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (state.status === "recording") {
      timerRef.current = setInterval(() => dispatch({ type: "TICK" }), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.status]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      sourceRef.current = audioCtxRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioCtxRef.current.createAnalyser();
      sourceRef.current.connect(analyserRef.current);
      drawWaveform();
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunks.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = handleStop;
      mediaRecorderRef.current.start();
      dispatch({ type: "START" });
    } catch (e) {
      dispatch({ type: "ERROR", error: "Microphone access denied or not available." });
    }
  }

  function pauseRecording() {
    mediaRecorderRef.current?.pause();
    dispatch({ type: "PAUSE" });
  }
  function resumeRecording() {
    mediaRecorderRef.current?.resume();
    dispatch({ type: "RESUME" });
  }
  function stopRecording() {
    mediaRecorderRef.current?.stop();
    dispatch({ type: "STOP" });
  }

  function handleStop() {
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    uploadAudio();
  }

  function drawWaveform() {
    if (!analyserRef.current || !canvasRef.current) return;
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    analyser.fftSize = 2048;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    function draw() {
      if (!ctx) return;
      analyser.getByteTimeDomainData(dataArray);
      ctx.fillStyle = "#231a11";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#c9a96e";
      ctx.beginPath();
      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      animationRef.current = requestAnimationFrame(draw);
    }
    draw();
  }

  async function uploadAudio() {
    dispatch({ type: "UPLOADING" });
    const blob = new Blob(audioChunks.current, { type: "audio/webm" });
    const fileName = `memory-files/${ancestorId}/recordings/${uuidv4()}.webm`;
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.storage.from("memory-files").upload(fileName, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: "audio/webm",
    });
    if (error) {
      dispatch({ type: "ERROR", error: "Upload failed." });
      return;
    }
    // Call transcription API
    const res = await fetch("/api/memories/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: fileName, ancestorId }),
    });
    if (!res.ok) {
      dispatch({ type: "ERROR", error: "Transcription failed." });
      return;
    }
    const data = await res.json();
    dispatch({ type: "DONE", url: fileName, transcript: data.transcript });
    if (onTranscription) onTranscription(data.transcript);
  }

  function reset() {
    dispatch({ type: "RESET" });
  }

  return (
    <div className="bg-[#18120b] rounded-xl p-6 max-w-lg mx-auto shadow-lg text-cream flex flex-col items-center">
      <h2 className="text-2xl font-serif mb-4 text-gold">Record a Memory</h2>
      <div className="flex flex-col items-center mb-4">
        <button
          className={`w-20 h-20 rounded-full flex items-center justify-center bg-gold shadow-lg relative focus:outline-none transition-all min-h-[48px] min-w-[48px] ${
            state.status === "recording" ? "animate-pulse-rec" : ""
          }`}
          onClick={
            state.status === "idle" || state.status === "done" || state.status === "error"
              ? startRecording
              : state.status === "recording"
              ? stopRecording
              : undefined
          }
          aria-label={
            state.status === "recording" ? "Stop Recording" : "Start Recording"
          }
          disabled={state.status === "uploading"}
        >
          <span className="block w-10 h-10 bg-[#18120b] rounded-full" />
          {state.status === "recording" && (
            <span className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-gold animate-pulse-rec" />
          )}
        </button>
        <div className="mt-2 text-lg font-mono text-gold">
          {formatDuration(state.duration)}
        </div>
        <canvas
          ref={canvasRef}
          width={240}
          height={60}
          className="mt-2 w-full max-w-xs h-16 bg-[#231a11] rounded"
        />
      </div>
      <div className="flex gap-4 mb-4">
        {state.status === "recording" && (
          <button
            className="px-4 py-2 rounded bg-gold/80 text-[#18120b] font-bold min-h-[48px] min-w-[48px]"
            onClick={pauseRecording}
          >
            Pause
          </button>
        )}
        {state.status === "paused" && (
          <button
            className="px-4 py-2 rounded bg-gold/80 text-[#18120b] font-bold min-h-[48px] min-w-[48px]"
            onClick={resumeRecording}
          >
            Resume
          </button>
        )}
        {(state.status === "recording" || state.status === "paused") && (
          <button
            className="px-4 py-2 rounded bg-gold/80 text-[#18120b] font-bold min-h-[48px] min-w-[48px]"
            onClick={stopRecording}
          >
            Stop
          </button>
        )}
        {(state.status === "done" || state.status === "error") && (
          <button
            className="px-4 py-2 rounded bg-gold/60 text-[#18120b] font-bold min-h-[48px] min-w-[48px]"
            onClick={reset}
          >
            Reset
          </button>
        )}
      </div>
      {state.status === "uploading" && (
        <div className="text-gold mt-2">Uploading...</div>
      )}
      {state.transcript && (
        <div className="mt-4 w-full bg-[#231a11] rounded p-4 text-cream text-base">
          <div className="text-gold font-semibold mb-2">Transcript:</div>
          <div>{state.transcript}</div>
        </div>
      )}
      {state.error && (
        <div className="mt-4 text-red-400 text-center">{state.error}</div>
      )}
      <style jsx>{`
        @keyframes pulse-rec {
          0% {
            box-shadow: 0 0 0 0 rgba(201,169,110,0.7);
          }
          70% {
            box-shadow: 0 0 0 20px rgba(201,169,110,0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(201,169,110,0);
          }
        }
        .animate-pulse-rec {
          animation: pulse-rec 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
