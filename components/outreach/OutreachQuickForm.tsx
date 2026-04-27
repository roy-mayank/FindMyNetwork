"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { updatePersonReachAction } from "@/app/actions/network";
import type { NetworkData, PersonNetworkNode } from "@/lib/network-types";

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
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Last outreach (reached)
            <input
              type="date"
              value={lastOutreach}
              onChange={(e) => setLastOutreach(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setLastOutreach(todayISODate())}
              className="rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Today
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setLastOutreach("")}
              className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Clear field
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => void persistReach({ lastOutreachAt: todayISODate() })}
              className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
            >
              Save today only
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => void persistReach({ lastOutreachAt: null })}
              className="rounded-md border border-red-200 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              Clear in DB
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Last attempt
            <input
              type="date"
              value={lastAttempt}
              onChange={(e) => setLastAttempt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setLastAttempt(todayISODate())}
              className="rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Today
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setLastAttempt("")}
              className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Clear field
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => void persistReach({ lastAttemptAt: todayISODate() })}
              className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
            >
              Save today only
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => void persistReach({ lastAttemptAt: null })}
              className="rounded-md border border-red-200 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
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
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Mark both today
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => void persistReach()}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {isPending ? "Saving…" : "Save from fields"}
        </button>
      </div>
      {saveError ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{saveError}</p>
      ) : null}
      {saveOk ? (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">{saveOk}</p>
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
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
        {loadError}
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 rounded-lg bg-red-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-900"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading contacts…</p>
    );
  }

  if (people.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No people in the graph yet. Add a person from the home page or seed the database.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Back to graph
        </Link>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Refresh list
        </button>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Reach dates</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Update last outreach (reached) and last attempt instantly. Dates use your local calendar day.
        </p>

        <label className="mt-5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
          Person
          <select
            value={activeId}
            onChange={(e) => setPersonId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
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

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Voice input</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Record audio for a future Whisper / Lemonfox pipeline, or use optional browser live captioning
          (Chrome) as a temporary transcript. Nothing is sent to a transcription API yet.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {!recording ? (
            <button
              type="button"
              onClick={() => void startRecording()}
              className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700"
            >
              Start recording
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700"
            >
              Stop recording
            </button>
          )}
          <button
            type="button"
            onClick={toggleLiveCaption}
            className={`rounded-lg px-3 py-2 text-xs font-medium ${
              captioning
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {captioning ? "Stop live caption" : "Live caption (browser)"}
          </button>
        </div>
        {recordError ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{recordError}</p>
        ) : null}
        {lastBlob ? (
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
            Last clip: {(lastBlob.size / 1024).toFixed(1)} KB — wire this blob to your transcription endpoint
            next.
          </p>
        ) : null}

        <label className="mt-4 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
          Transcript / notes (manual paste or live caption)
          <textarea
            rows={4}
            value={voiceTranscript}
            onChange={(e) => setVoiceTranscript(e.target.value)}
            placeholder="Transcription will appear here after you plug in Whisper or Lemonfox, or use live caption in supported browsers."
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          />
        </label>
      </section>
    </div>
  );
}
