import { useEffect, useState } from "react";
import { buildRequest, INVOICE_PRESET, PRESETS } from "./presets";
import type { PredictResponse, QuestionDraft } from "./types";
import { QuestionEditor } from "./components/QuestionEditor";
import { ResultsPanel } from "./components/ResultsPanel";
import { Alert } from "./components/ui/Alert";
import { Badge } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import { Card, CardHeader, CardTitle } from "./components/ui/Card";
import { Label, Textarea } from "./components/ui/Field";

export default function App() {
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
      .then((r) => r.json())
      .then((data: { configured?: boolean }) => setConfigured(Boolean(data.configured)))
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

      const payload = (await res.json()) as PredictResponse;
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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Laya Query Playground
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            Compose state and typed questions, then call your self-hosted{" "}
            <code>/v1/predict</code> endpoint.
          </p>
        </div>
        <Badge
          variant={
            configured === null ? "default" : configured ? "success" : "warning"
          }
        >
          {configured === null
            ? "Checking config…"
            : configured
              ? "Server configured"
              : "Set LAYA_DOMAIN and LAYA_API_KEY in .env"}
        </Badge>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
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
            State (JSON object or plain text)
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

        <ResultsPanel
          response={response}
          error={error}
          meta={meta}
          loading={loading}
        />
      </div>
    </div>
  );
}
