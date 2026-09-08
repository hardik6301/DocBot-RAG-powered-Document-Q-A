"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechRecPhase = "idle" | "listening" | "transcribing";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Options = {
  onFinal: (transcript: string, sttMs: number) => void;
  onInterim?: (transcript: string) => void;
  lang?: string;
};

export function useSpeechRecognition({
  onFinal,
  onInterim,
  lang = "en-US",
}: Options) {
  const [supported, setSupported] = useState(false);
  const [phase, setPhase] = useState<SpeechRecPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [interim, setInterim] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const startedAtRef = useRef(0);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);

  useEffect(() => {
    onFinalRef.current = onFinal;
    onInterimRef.current = onInterim;
  }, [onFinal, onInterim]);

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    setSupported(Boolean(Ctor));
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      setPhase("listening");
      setError(null);
      setInterim("");
      interimRef.current = "";
      finalRef.current = "";
      startedAtRef.current = performance.now();
    };

    recognition.onresult = (event) => {
      let interimText = "";
      let finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]!;
        const piece = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += piece;
        else interimText += piece;
      }
      if (finalText) {
        finalRef.current = `${finalRef.current} ${finalText}`.trim();
        setPhase("transcribing");
        setInterim(finalRef.current);
        interimRef.current = finalRef.current;
      } else if (interimText) {
        interimRef.current = interimText;
        setInterim(interimText);
        onInterimRef.current?.(interimText);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        setPhase("idle");
        return;
      }
      setError(
        event.error === "not-allowed"
          ? "Microphone permission denied"
          : `Speech error: ${event.error}`,
      );
      setPhase("idle");
    };

    recognition.onend = () => {
      const text = (finalRef.current || interimRef.current).trim();
      const sttMs = Math.round(performance.now() - startedAtRef.current);
      setPhase("idle");
      setInterim("");
      interimRef.current = "";
      if (text) onFinalRef.current(text, sttMs);
    };

    recognitionRef.current = recognition;
    return () => {
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || phase === "listening" || phase === "transcribing") {
      return;
    }
    setError(null);
    try {
      recognition.start();
    } catch {
      setError("Could not start microphone");
      setPhase("idle");
    }
  }, [phase]);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.stop();
    } catch {
      setPhase("idle");
    }
  }, []);

  const toggle = useCallback(() => {
    if (phase === "listening" || phase === "transcribing") stop();
    else start();
  }, [phase, start, stop]);

  return {
    supported,
    phase,
    error,
    interim,
    start,
    stop,
    toggle,
  };
}
