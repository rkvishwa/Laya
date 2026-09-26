import type { Answer, PredictResponse, ScoreAnswer } from "../types";
import { Alert } from "./ui/Alert";
import { Badge } from "./ui/Badge";
import { Card, CardHeader, CardTitle } from "./ui/Card";

interface Props {
  response: PredictResponse | null;
  error: string | null;
  meta: string | null;
  loading: boolean;
}

function ProbabilityBars({
  items,
}: {
  items: Array<{ label: string; value: number }>;
}) {
  if (items.length === 0) {
    return (
      <p className="mt-2 text-sm text-slate-500">No probability data returned.</p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {items.map(({ label, value }) => (
        <div
          key={label}
          className="grid grid-cols-[minmax(0,7rem)_1fr_3rem] items-center gap-2"
        >
          <span className="truncate text-sm text-slate-700">{label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
              style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }}
            />
          </div>
          <span className="text-right text-xs text-slate-500">
            {(value * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function scoreDisplay(answer: ScoreAnswer): string {
  if (typeof answer.score === "number" && Number.isFinite(answer.score)) {
    return answer.score.toFixed(4);
  }
  return "—";
}

export function ResultsPanel({ response, error, meta, loading }: Props) {
  function renderAnswer(id: string, answer: Answer) {
    const probabilities = answer.probabilities ?? {};

    return (
      <div
        key={id}
        className="rounded-lg border border-slate-200 bg-slate-50/80 p-4"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="font-semibold text-slate-900">{id}</span>
          <Badge>{answer.type}</Badge>
        </div>

        {answer.type === "choice" && (
          <>
            <div className="flex items-center justify-between gap-3">
              <strong className="text-lg text-slate-900">{answer.choice}</strong>
              {answer.confidence !== undefined && (
                <span className="text-sm text-slate-500">
                  confidence {(answer.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <ProbabilityBars
              items={Object.entries(probabilities).map(([label, p]) => ({
                label,
                value: p,
              }))}
            />
          </>
        )}

        {answer.type === "score" && (
          <>
            <div className="flex items-center justify-between gap-3">
              <strong className="text-lg text-slate-900">
                {scoreDisplay(answer)}
                {answer.choice !== undefined && answer.choice !== "" && (
                  <span className="ml-2 text-base font-medium text-slate-700">
                    ({answer.choice})
                  </span>
                )}
              </strong>
              {answer.confidence !== undefined && (
                <span className="text-sm text-slate-500">
                  confidence {(answer.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <ProbabilityBars
              items={Object.entries(probabilities).map(([label, p]) => ({
                label,
                value: p,
              }))}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results</CardTitle>
        {meta && <span className="text-sm text-slate-500">{meta}</span>}
      </CardHeader>

      {loading && <p className="text-sm text-slate-500">Waiting for Laya…</p>}

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {!loading && !error && !response && (
        <p className="text-sm text-slate-500">
          Run a query to see structured answers here.
        </p>
      )}

      {!loading && response && (
        <div className="space-y-4">
          {response.model && (
            <p className="text-sm text-slate-600">Model: {response.model}</p>
          )}
          {response.status && response.status !== "success" && (
            <Alert variant="warning">
              API status: {response.status}
            </Alert>
          )}
          {response.answers &&
            Object.entries(response.answers).map(([id, answer]) =>
              renderAnswer(id, answer),
            )}
          <details className="rounded-lg border border-slate-200 bg-slate-50">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-700">
              Raw JSON
            </summary>
            <pre className="mx-3 mb-3 overflow-auto rounded-md border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800">
              {JSON.stringify(response, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </Card>
  );
}
