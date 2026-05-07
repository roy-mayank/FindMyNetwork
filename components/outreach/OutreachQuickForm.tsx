"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { updatePersonReachAction } from "@/app/actions/network";
import type { NetworkData, PersonNetworkNode } from "@/lib/network-types";

const oLabel =
  "block text-xs font-semibold uppercase tracking-wide text-violet-800/90 dark:text-amber-200/90";
const oInput =
  "mt-1 w-full rounded-xl border-2 border-sky-200/90 bg-white/95 px-3 py-2 text-sm text-zinc-900 shadow-inner outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-amber-200/80 dark:border-violet-500/35 dark:bg-zinc-950/90 dark:text-zinc-100 dark:focus:border-amber-400 dark:focus:ring-fuchsia-500/35";
const oSection =
  "rounded-3xl border-2 border-amber-200/60 bg-white/85 p-6 shadow-lg shadow-amber-200/15 backdrop-blur-sm dark:border-violet-500/25 dark:bg-zinc-900/70 dark:shadow-violet-950/25";

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((ev: Event) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type PersonReachEditorProps = {
  person: PersonNetworkNode;
  onReload: () => Promise<void>;
};

function PersonReachEditor({ person, onReload }: PersonReachEditorProps) {
  const [lastOutreach, setLastOutreach] = useState(
    () => person.lastOutreachAt?.slice(0, 10) ?? "",
  );
  const [lastAttempt, setLastAttempt] = useState(
    () => person.lastAttemptAt?.slice(0, 10) ?? "",
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const persistReach = useCallback(
    (overrides?: { lastOutreachAt?: string | null; lastAttemptAt?: string | null }) => {
      setSaveError(null);
      setSaveOk(null);
      startTransition(async () => {
        const payload: {
          personId: string;
          lastOutreachAt?: string | null;
          lastAttemptAt?: string | null;
        } = { personId: person.id };

        if (overrides) {
          if ("lastOutreachAt" in overrides) payload.lastOutreachAt = overrides.lastOutreachAt;
          if ("lastAttemptAt" in overrides) payload.lastAttemptAt = overrides.lastAttemptAt;
        } else {
          if (lastOutreach.trim() !== "") payload.lastOutreachAt = lastOutreach.trim();
          if (lastAttempt.trim() !== "") payload.lastAttemptAt = lastAttempt.trim();
        }

        if (payload.lastOutreachAt === undefined && payload.lastAttemptAt === undefined) {
          setSaveError("Set at least one date or use Today / Clear.");
          return;
        }

        const result = await updatePersonReachAction(payload);
        if (!result.ok) {
          setSaveError(result.error);
          return;
        }
        setSaveOk("Saved.");
        await onReload();
      });
    },
    [lastAttempt, lastOutreach, onReload, person.id],
  );

  return (
    <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={oLabel}>
            Last outreach (reached)
            <input
              type="date"
              value={lastOutreach}
              onChange={(e) => setLastOutreach(e.target.value)}
              className={oInput}
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setLastOutreach(todayISODate())}
              className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-50"
            >
              Today
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setLastOutreach("")}
              className="rounded-full border-2 border-sky-200/90 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-sky-900 hover:border-violet-300 disabled:opacity-50 dark:border-violet-500/40 dark:bg-zinc-900 dark:text-sky-100"
            >
              Clear field
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => void persistReach({ lastOutreachAt: todayISODate() })}
              className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-50"
            >
              Save today only
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => void persistReach({ lastOutreachAt: null })}
              className="rounded-full border-2 border-rose-300/90 bg-rose-50/90 px-3 py-1.5 text-[11px] font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-600/50 dark:bg-rose-950/40 dark:text-rose-100"
            >
              Clear in DB
            </button>
          </div>
        </div>
        <div>
          <label className={oLabel}>
            Last attempt
            <input
              type="date"
              value={lastAttempt}
              onChange={(e) => setLastAttempt(e.target.value)}
              className={oInput}
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setLastAttempt(todayISODate())}
              className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-50"
            >
              Today
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setLastAttempt("")}
              className="rounded-full border-2 border-sky-200/90 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-sky-900 hover:border-violet-300 disabled:opacity-50 dark:border-violet-500/40 dark:bg-zinc-900 dark:text-sky-100"
            >
              Clear field
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => void persistReach({ lastAttemptAt: todayISODate() })}
              className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-50"
            >
              Save today only
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => void persistReach({ lastAttemptAt: null })}
              className="rounded-full border-2 border-rose-300/90 bg-rose-50/90 px-3 py-1.5 text-[11px] font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-600/50 dark:bg-rose-950/40 dark:text-rose-100"
            >
              Clear in DB
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            const t = todayISODate();
            setLastOutreach(t);
            setLastAttempt(t);
            void persistReach({ lastOutreachAt: t, lastAttemptAt: t });
          }}
          className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-400/25 transition hover:brightness-110 disabled:opacity-50"
        >
          Mark both today
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => void persistReach()}
          className="rounded-full border-2 border-violet-200/90 bg-white/90 px-5 py-2.5 text-sm font-bold text-violet-900 shadow-sm transition hover:border-violet-400 disabled:opacity-50 dark:border-violet-500/40 dark:bg-zinc-900 dark:text-violet-100"
        >
          {isPending ? "Saving…" : "Save from fields"}
        </button>
      </div>
      {saveError ? (
        <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-300">{saveError}</p>
      ) : null}
      {saveOk ? (
        <p className="mt-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">{saveOk}</p>
      ) : null}
    </>
  );
}

export function OutreachQuickForm() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [personId, setPersonId] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [captioning, setCaptioning] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/network", { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as NetworkData;
      setData(json);
    } catch (e) {
      setData(null);
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const people = useMemo(
    () =>
      (data?.nodes.filter((n): n is PersonNetworkNode => n.kind === "person") ?? []).sort(
        (a, b) => a.label.localeCompare(b.label),
      ),
    [data],
  );

  const activeId = personId || people[0]?.id || "";
  const activePerson = people.find((p) => p.id === activeId);

  const startRecording = async () => {
    setRecordError(null);
    setLastBlob(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setLastBlob(blob);
        setRecording(false);
      };
      mr.start(200);
      setRecording(true);
    } catch (e) {
      setRecordError(e instanceof Error ? e.message : "Microphone access failed");
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    mediaRecorderRef.current = null;
  };

  const toggleLiveCaption = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setRecordError("Live caption needs a Chromium browser with speech recognition.");
      return;
    }
    if (captioning) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setCaptioning(false);
      return;
    }
    setRecordError(null);
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (ev) => {
      const event = ev as unknown as {
        resultIndex: number;
        results: { length: number; item: (i: number) => { 0: { transcript: string } } };
      };
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        text += event.results.item(i)[0].transcript;
      }
      if (text) {
        setVoiceTranscript((current) => (current ? `${current} ${text}`.trim() : text.trim()));
      }
    };
    rec.onerror = () => {
      setCaptioning(false);
      recognitionRef.current = null;
    };
    rec.onend = () => {
      setCaptioning(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = rec;
    rec.start();
    setCaptioning(true);
  };

  if (loadError) {
    return (
      <div className="rounded-3xl border-2 border-rose-300/80 bg-gradient-to-br from-rose-50 to-amber-50 p-5 text-sm text-rose-950 shadow-lg dark:border-rose-500/40 dark:from-rose-950/50 dark:to-amber-950/30 dark:text-rose-100">
        {loadError}
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm font-medium text-violet-800 dark:text-violet-200">Loading contacts…</p>
    );
  }

  if (people.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        No people in the graph yet. Add a person from the{" "}
        <Link
          href="/collect"
          className="font-bold text-fuchsia-700 underline-offset-2 hover:underline dark:text-fuchsia-300"
        >
          data collection
        </Link>{" "}
        page or seed the database.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/graph"
          className="rounded-full border-2 border-sky-200/80 bg-white/90 px-4 py-2 text-sm font-semibold text-sky-900 shadow-sm transition hover:border-sky-400 dark:border-sky-500/40 dark:bg-zinc-900/80 dark:text-sky-100"
        >
          ← Graph
        </Link>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-violet-400/25 hover:brightness-110"
        >
          Refresh list
        </button>
      </div>

      <section className={oSection}>
        <h2 className="text-lg font-bold text-sky-900 dark:text-sky-100">Reach dates</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          Update last outreach (reached) and last attempt instantly. Dates use your local calendar day.
        </p>

        <label className={`mt-5 ${oLabel}`}>
          Person
          <select
            value={activeId}
            onChange={(e) => setPersonId(e.target.value)}
            className={oInput}
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        {activePerson ? (
          <PersonReachEditor
            key={`${activePerson.id}-${activePerson.lastOutreachAt ?? ""}-${activePerson.lastAttemptAt ?? ""}`}
            person={activePerson}
            onReload={load}
          />
        ) : null}
      </section>

      <section className={oSection}>
        <h2 className="text-lg font-bold text-fuchsia-900 dark:text-fuchsia-100">Voice input</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          Record audio for a future Whisper / Lemonfox pipeline, or use optional browser live captioning
          (Chrome) as a temporary transcript. Nothing is sent to a transcription API yet.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {!recording ? (
            <button
              type="button"
              onClick={() => void startRecording()}
              className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110"
            >
              Start recording
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110"
            >
              Stop recording
            </button>
          )}
          <button
            type="button"
            onClick={toggleLiveCaption}
            className={`rounded-full px-4 py-2 text-xs font-bold shadow-sm transition ${
              captioning
                ? "bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:brightness-110"
                : "border-2 border-amber-200/90 bg-white/90 text-amber-950 hover:border-amber-400 dark:border-amber-500/40 dark:bg-zinc-900 dark:text-amber-100"
            }`}
          >
            {captioning ? "Stop live caption" : "Live caption (browser)"}
          </button>
        </div>
        {recordError ? (
          <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-300">{recordError}</p>
        ) : null}
        {lastBlob ? (
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            Last clip: {(lastBlob.size / 1024).toFixed(1)} KB — wire this blob to your transcription endpoint
            next.
          </p>
        ) : null}

        <label className={`mt-4 ${oLabel}`}>
          Transcript / notes (manual paste or live caption)
          <textarea
            rows={4}
            value={voiceTranscript}
            onChange={(e) => setVoiceTranscript(e.target.value)}
            placeholder="Transcription will appear here after you plug in Whisper or Lemonfox, or use live caption in supported browsers."
            className={oInput}
          />
        </label>
      </section>
    </div>
  );
}
