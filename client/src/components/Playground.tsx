import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";
import { parseJsonResponse } from "../lib/api";
import {
  buildRequest,
  formatNaturalState,
  INVOICE_PRESET,
  PRESETS,
  readSubjectBody,
} from "../presets";
import type { PredictResponse, QuestionDraft, StateInputMode } from "../types";
import { QuestionEditor } from "./QuestionEditor";
import { ResultsPanel } from "./ResultsPanel";
import { AppHeader } from "./AppHeader";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import { Card, CardHeader, CardTitle } from "./ui/Card";
import { Input, Label, Textarea } from "./ui/Field";

const STATE_MODE_KEY = "laya.playground.stateMode";

function readStateMode(): StateInputMode {
  try {
    const value = localStorage.getItem(STATE_MODE_KEY);
    if (value === "natural" || value === "json") return value;
  } catch {
    // Storage can be unavailable in private browsing.
  }
  return "natural";
}

function writeStateMode(mode: StateInputMode) {
  try {
    localStorage.setItem(STATE_MODE_KEY, mode);
  } catch {
    // Ignore quota or privacy errors; the in-memory choice still applies.
  }
}

function StateModeToggle({
  mode,
  onChange,
}: {
  mode: StateInputMode;
  onChange: (mode: StateInputMode) => void;
}) {
  const options: Array<{ id: StateInputMode; label: string }> = [
    { id: "natural", label: "Natural language" },
    { id: "json", label: "JSON" },
  ];

  return (
    <div
      className="flex w-full rounded-lg border border-slate-200 bg-slate-100 p-0.5 sm:inline-flex sm:w-fit"
      role="group"
      aria-label="State input"
    >
      {options.map((option) => {
        const active = mode === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            className={cn(
              "min-h-11 flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:min-h-0 sm:flex-none sm:py-1.5",
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

interface PlaygroundProps {
  sessionEmail: string;
  sessionRole: "admin" | "guest";
  onLogout: () => void;
}

export function Playground({ sessionEmail, sessionRole, onLogout }: PlaygroundProps) {
  const initialNatural = readSubjectBody(INVOICE_PRESET.stateText) ?? {
    subject: "",
    body: "",
  };
  const [stateMode, setStateMode] = useState<StateInputMode>(readStateMode);
  const [stateText, setStateText] = useState(INVOICE_PRESET.stateText);
  const [subject, setSubject] = useState(initialNatural.subject);
  const [body, setBody] = useState(initialNatural.body);
  const naturalDirty = useRef(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    INVOICE_PRESET.questions,
  );
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PredictResponse | null>(null);
  const [meta, setMeta] = useState<string | null>(null);

  const { request, error: buildError } = buildRequest(
    { mode: stateMode, stateText, subject, body },
    questions,
  );

  useEffect(() => {
    fetch("/api/health")
      .then((r) => parseJsonResponse<{ configured?: boolean }>(r))
      .then((data) => setConfigured(Boolean(data.configured)))
      .catch(() => setConfigured(false));
  }, []);

  function loadPreset(index: number) {
    const preset = PRESETS[index];
    const natural = readSubjectBody(preset.stateText);
    setStateText(preset.stateText);
    if (natural) {
      setSubject(natural.subject);
      setBody(natural.body);
    }
    naturalDirty.current = false;
    setQuestions(preset.questions.map((q) => ({ ...q })));
    setError(null);
    setResponse(null);
    setMeta(null);
  }

  function selectStateMode(next: StateInputMode) {
    if (next === stateMode) return;
    if (next === "json" && naturalDirty.current) {
      setStateText(formatNaturalState(subject, body));
    }
    if (next === "natural") {
      const natural = readSubjectBody(stateText);
      if (natural) {
        setSubject(natural.subject);
        setBody(natural.body);
      }
    }
    naturalDirty.current = false;
    setStateMode(next);
    writeStateMode(next);
  }

  async function runQuery() {
    if (!request) {
      setError(buildError);
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    setMeta(null);

    const started = performance.now();

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const payload = await parseJsonResponse<PredictResponse>(res);
      const elapsed = Math.round(performance.now() - started);

      if (!res.ok) {
        setError(payload.detail || payload.error || `Request failed (${res.status})`);
        setResponse(payload);
        setMeta(`${res.status} · ${elapsed} ms`);
        return;
      }

      setResponse(payload);
      setMeta(`${res.status} · ${elapsed} ms`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="mx-auto max-w-7xl py-4 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:px-6 sm:py-6 lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden lg:px-8"
    >
      <AppHeader
        sessionEmail={sessionEmail}
        sessionRole={sessionRole}
        configured={configured}
        currentPath="playground"
        onLogout={onLogout}
      />

      <div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:scrollbar-none">
          <Card>
            <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <CardTitle>Request builder</CardTitle>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset, index) => (
                  <Button
                    key={preset.name}
                    type="button"
                    variant="ghost"
                    onClick={() => loadPreset(index)}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </CardHeader>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium text-slate-700">State</span>
              <StateModeToggle mode={stateMode} onChange={selectStateMode} />
            </div>

            {stateMode === "natural" ? (
              <div className="mt-3 space-y-3">
                <Label>
                  Subject
                  <Input
                    value={subject}
                    onChange={(e) => {
                      naturalDirty.current = true;
                      setSubject(e.target.value);
                    }}
                    placeholder="Need invoice"
                  />
                </Label>
                <Label>
                  Body
                  <Textarea
                    rows={6}
                    className="font-sans"
                    value={body}
                    onChange={(e) => {
                      naturalDirty.current = true;
                      setBody(e.target.value);
                    }}
                    placeholder="Please send receipt for order #4821"
                  />
                </Label>
              </div>
            ) : (
              <Label className="mt-3">
                JSON object
                <Textarea
                  rows={8}
                  value={stateText}
                  onChange={(e) => setStateText(e.target.value)}
                />
              </Label>
            )}

            <QuestionEditor questions={questions} onChange={setQuestions} />

            {buildError && (
              <Alert variant="warning" className="mt-4">
                {buildError}
              </Alert>
            )}

            <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 open:pb-3">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-700">
                Request preview
              </summary>
              <pre className="mx-3 overflow-auto rounded-md border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800">
                {request ? JSON.stringify(request, null, 2) : "{}"}
              </pre>
            </details>

            <Button
              type="button"
              variant="primary"
              className="mt-4 w-full py-2.5 font-semibold"
              disabled={loading || !request}
              onClick={runQuery}
            >
              {loading ? "Running…" : "Run query"}
            </Button>
          </Card>
        </div>

        <div className="lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:scrollbar-none">
          <ResultsPanel
            response={response}
            error={error}
            meta={meta}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
