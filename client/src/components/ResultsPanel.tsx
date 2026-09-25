import type { Answer, NoulAnswer, PredictResponse } from "../types";

function noulYesProbability(answer: NoulAnswer): number {
  if (typeof answer.noul === "number") {
    return answer.noul;
  }
  const pTrue = answer.probabilities?.true;
  if (typeof pTrue === "number") {
    return pTrue;
  }
  return 0;
}

function noulHeadlineYes(answer: NoulAnswer, yesProb: number): boolean {
  if (answer.choice !== undefined) {
    return answer.choice === "true" || answer.choice.toLowerCase() === "yes";
  }
  return yesProb >= 0.5;
}
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

export function ResultsPanel({ response, error, meta, loading }: Props) {
  function renderAnswer(id: string, answer: Answer) {
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
              items={Object.entries(answer.probabilities).map(([label, p]) => ({
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
                {answer.score.toFixed(2)}
                {answer.choice !== undefined && (
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
              items={Object.entries(answer.probabilities).map(([key, p]) => ({
                label: answer.legend?.[key] ?? key,
                value: p,
              }))}
            />
          </>
        )}

        {answer.type === "noul" && (() => {
          const yesProb = noulYesProbability(answer);
          const yes = noulHeadlineYes(answer, yesProb);
          const bars =
            answer.probabilities &&
            typeof answer.probabilities.false === "number" &&
            typeof answer.probabilities.true === "number"
              ? [
                  { label: "false", value: answer.probabilities.false },
                  { label: "true", value: answer.probabilities.true },
                ]
              : [
                  { label: "no", value: 1 - yesProb },
                  { label: "yes", value: yesProb },
                ];
          return (
            <>
              <div className="flex items-center justify-between gap-3">
                <strong className="text-lg text-slate-900">
                  {yes ? "yes" : "no"}
                </strong>
                <span className="text-sm text-slate-500">
                  {answer.confidence !== undefined && (
                    <>
                      confidence {(answer.confidence * 100).toFixed(0)}% ·{" "}
                    </>
                  )}
                  probability yes {(yesProb * 100).toFixed(0)}%
                </span>
              </div>
              <ProbabilityBars items={bars} />
            </>
          );
        })()}
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
          {response.answers &&
            Object.entries(response.answers).map(([id, answer]) =>
              renderAnswer(id, answer),
            )}
          {response.usage && (
            <p className="text-sm text-slate-500">
              Tokens: {response.usage.input_tokens ?? "?"} in /{" "}
              {response.usage.output_tokens ?? "?"} out
            </p>
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
