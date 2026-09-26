import { useEffect, useState } from "react";
import { parseJsonResponse } from "../lib/api";
import { buildRequest, INVOICE_PRESET, PRESETS } from "../presets";
import type { PredictResponse, QuestionDraft } from "../types";
import { QuestionEditor } from "./QuestionEditor";
import { ResultsPanel } from "./ResultsPanel";
import { AppHeader } from "./AppHeader";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import { Card, CardHeader, CardTitle } from "./ui/Card";
import { Label, Textarea } from "./ui/Field";

interface PlaygroundProps {
  sessionEmail: string;
  sessionRole: "admin" | "guest";
  onLogout: () => void;
}

export function Playground({ sessionEmail, sessionRole, onLogout }: PlaygroundProps) {
  const [stateText, setStateText] = useState(INVOICE_PRESET.stateText);
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    INVOICE_PRESET.questions,
  );
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PredictResponse | null>(null);
  const [meta, setMeta] = useState<string | null>(null);

  const { request, error: buildError } = buildRequest(stateText, questions);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => parseJsonResponse<{ configured?: boolean }>(r))
      .then((data) => setConfigured(Boolean(data.configured)))
      .catch(() => setConfigured(false));
  }, []);

  function loadPreset(index: number) {
    const preset = PRESETS[index];
    setStateText(preset.stateText);
    setQuestions(preset.questions.map((q) => ({ ...q })));
    setError(null);
    setResponse(null);
    setMeta(null);
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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden lg:px-8">
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

            <Label>
              State (JSON object)
              <Textarea
                rows={8}
                value={stateText}
                onChange={(e) => setStateText(e.target.value)}
              />
            </Label>

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
