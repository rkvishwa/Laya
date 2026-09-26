import { useEffect, useState } from "react";
import { parseJsonResponse } from "../lib/api";
import { INVOICE_PRESET, SUPPORT_TICKET_PRESET } from "../presets";
import { AppHeader } from "./AppHeader";
import { Card, CardHeader, CardTitle } from "./ui/Card";

interface DocsInfo {
  guestLoginEnabled?: boolean;
  guestApiKey?: string | null;
  predictUrl?: string | null;
}

interface DocsPageProps {
  sessionEmail: string;
  sessionRole: "admin" | "guest";
  onLogout: () => void;
}

const exampleRequest = {
  state: {
    subject: "Need invoice",
    body: "Please send receipt for order #4821",
  },
  questions: {
    dept: {
      type: "choice",
      instructions: "Route inquiry to the correct department",
      criteria: {
        billing: "Invoices, payment failures, double charges, refunds",
        technical: "Software bugs, crashes, performance degradation",
        sales: "Enterprise volume pricing, custom integrations",
      },
    },
  },
};

const exampleResponse = {
  status: "success",
  answers: {
    dept: {
      type: "choice",
      choice: "billing",
      confidence: 0.92,
      probabilities: {
        billing: 0.92,
        technical: 0.05,
        sales: 0.03,
      },
    },
  },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-700">
        {children}
      </div>
    </section>
  );
}

function buildCurlExample(predictUrl: string, guestApiKey: string) {
  const body = JSON.stringify(exampleRequest, null, 2);
  return `curl -sS -X POST '${predictUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-API-Key: ${guestApiKey}' \\
  -d '${body.replace(/'/g, "'\\''")}'`;
}

export function DocsPage({ sessionEmail, sessionRole, onLogout }: DocsPageProps) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [docsInfo, setDocsInfo] = useState<DocsInfo | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => parseJsonResponse<{ configured?: boolean }>(r))
      .then((data) => setConfigured(Boolean(data.configured)))
      .catch(() => setConfigured(false));

    fetch("/api/docs-info")
      .then((r) => parseJsonResponse<DocsInfo>(r))
      .then((data) => setDocsInfo(data))
      .catch(() => setDocsInfo(null));
  }, []);

  return (
    <div
      className="mx-auto max-w-7xl py-4 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:px-6 sm:py-6 lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden lg:px-8"
    >
      <AppHeader
        sessionEmail={sessionEmail}
        sessionRole={sessionRole}
        configured={configured}
        currentPath="docs"
        onLogout={onLogout}
      />

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:scrollbar-none">
        <div className="space-y-8 pb-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <p className="text-sm leading-relaxed text-slate-700">
            The Brainvave Decision Model evaluates structured context and returns
            answers to one or more questions in a single request. Each question is
            either a <strong>choice</strong> (pick one labeled option) or a{" "}
            <strong>score</strong> (ordinal level along a scale you define). You
            can try it in the <strong>Playground</strong> or send the same JSON
            from your own application.
          </p>
        </Card>

        <Card className="space-y-6">
          <Section title="Testing in the playground">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Open <strong>Playground</strong> from the navigation above.
              </li>
              <li>
                Start from a preset (<strong>Invoice routing</strong> or{" "}
                <strong>Support ticket</strong>), or enter state as natural
                language (subject and body) or JSON, then add questions.
              </li>
              <li>
                Use <strong>Request preview</strong> to check the JSON before
                you send it.
              </li>
              <li>
                Click <strong>Run query</strong>. The results panel shows the
                chosen answer or score, probability bars, confidence, and raw
                JSON.
              </li>
            </ol>
            <p>
              Iterate on instructions and option descriptions—clear criteria
              usually produce more stable answers. Compare several states side
              by side by editing state and re-running.
            </p>
          </Section>

          {docsInfo?.guestLoginEnabled && docsInfo.guestApiKey && (
            <Section title="Testing in your own applications">
              <p>
                Use the same request shape as the playground. Send a{" "}
                <code>POST</code> with <code>Content-Type: application/json</code>{" "}
                and the API key below in the <code>X-API-Key</code> header.
              </p>
              <p className="font-medium text-slate-900">API key</p>
              <pre className="overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
                {docsInfo.guestApiKey}
              </pre>
              {docsInfo.predictUrl && (
                <>
                  <p className="font-medium text-slate-900">Example (curl)</p>
                  <pre className="overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 whitespace-pre-wrap">
                    {buildCurlExample(docsInfo.predictUrl, docsInfo.guestApiKey)}
                  </pre>
                </>
              )}
              <p>
                You can also call this app&apos;s{" "}
                <code>/api/predict</code> from a browser or backend while your
                session cookie is present—the playground uses that path
                automatically.
              </p>
            </Section>
          )}

          <Section title="Accuracy and confidence">
            <p>
              On typical decision tasks, per-answer <strong>confidence</strong>{" "}
              often falls between about <strong>0.648</strong> and{" "}
              <strong>0.697</strong>. That range reflects how strongly the model
              separates the best option from the rest on structured inputs—not a
              guarantee for every request.
            </p>
            <p>
              Use <code>confidence</code> together with{" "}
              <code>probabilities</code>: a high top probability with confidence
              in that band usually means a solid automatic decision; a flat
              probability spread or confidence toward the lower end of the range
              is a signal to review, escalate, or ask for more context in{" "}
              <code>state</code>.
            </p>
            <p>
              Sharper question instructions and distinct option definitions tend
              to improve both the chosen label and the reported confidence.
            </p>
          </Section>

          <Section title="State">
            <p>
              <code>state</code> must be a non-empty JSON <strong>object</strong>{" "}
              (not an array or string). It is the shared context for every
              question in the request—emails, tickets, form fields, or any
              structured record your workflow needs. In the playground,{" "}
              <strong>Natural language</strong> collects a subject and body and
              sends them as the object below. <strong>JSON</strong> sends the
              object you write.
            </p>
            <pre className="overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
              {JSON.stringify(
                { subject: "Need invoice", body: "Please send receipt for order #4821" },
                null,
                2,
              )}
            </pre>
          </Section>

          <Section title="Choice questions">
            <p>
              Use <code>type: &quot;choice&quot;</code> when the answer must be one
              of several named options. Each option has a <strong>key</strong>{" "}
              (returned in the answer) and a <strong>description</strong> that
              explains when that option applies.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Id</strong>: unique key in the <code>questions</code>{" "}
                object (e.g. <code>dept</code>, <code>refund_requested</code>).
              </li>
              <li>
                <strong>Instructions</strong>: what the model should decide.
              </li>
              <li>
                <strong>Criteria</strong>: map of option keys to descriptions.
              </li>
            </ul>
            <p>
              For yes/no decisions, use a choice question with keys{" "}
              <code>true</code> and <code>false</code>, each with a clear
              definition. The playground&apos;s <strong>+ Boolean</strong> button
              adds this pattern.
            </p>
          </Section>

          <Section title="Score questions">
            <p>
              Use <code>type: &quot;score&quot;</code> for ordered levels from
              lowest to highest urgency, severity, priority, or similar. Provide
              at least <strong>two</strong> level descriptions in{" "}
              <code>criteria</code> as an array of strings.
            </p>
            <p>
              The response includes a numeric <code>score</code>, optional
              mapped <code>choice</code> label, per-level{" "}
              <code>probabilities</code>, and <code>confidence</code> when
              available.
            </p>
          </Section>

          <Section title="Multiple questions">
            <p>
              Add several questions in one request. They all read the same{" "}
              <code>state</code>. Answers are returned under{" "}
              <code>answers</code>, keyed by each question id.
            </p>
          </Section>

          <Section title="Request shape">
            <p>
              Every predict call sends a body like this. The playground builds it
              for you; in your app, serialize the same structure.
            </p>
            <pre className="overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
              {JSON.stringify(exampleRequest, null, 2)}
            </pre>
          </Section>

          <Section title="Response shape">
            <p>
              On success, expect <code>status</code> and an <code>answers</code>{" "}
              object. Each answer includes <code>type</code>,{" "}
              <code>probabilities</code>, and type-specific fields.
            </p>
            <pre className="overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
              {JSON.stringify(exampleResponse, null, 2)}
            </pre>
            <p>
              <strong>Choice</strong>: <code>choice</code> is the selected key.{" "}
              <strong>Score</strong>: <code>score</code> is numeric;{" "}
              <code>choice</code> may echo the nearest level label.
            </p>
          </Section>

          <Section title="Built-in presets">
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                <h3 className="font-medium text-slate-900">
                  {INVOICE_PRESET.name}
                </h3>
                <p className="mt-1 text-slate-600">{INVOICE_PRESET.description}</p>
                <p className="mt-2 text-slate-600">
                  One choice question (<code>dept</code>) routing a billing email
                  to billing, technical, or sales.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                <h3 className="font-medium text-slate-900">
                  {SUPPORT_TICKET_PRESET.name}
                </h3>
                <p className="mt-1 text-slate-600">
                  {SUPPORT_TICKET_PRESET.description}
                </p>
                <p className="mt-2 text-slate-600">
                  Combines choice questions for <code>department</code> and{" "}
                  <code>refund_requested</code> (boolean-style) with a score
                  question <code>urgency</code> for turnaround deadline.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Validation tips">
            <ul className="list-disc space-y-1 pl-5">
              <li>State must parse as valid JSON and contain at least one key.</li>
              <li>Every question needs a non-empty id and instructions.</li>
              <li>Choice questions need at least one option with key and text.</li>
              <li>Boolean choices need both <code>true</code> and <code>false</code> defined.</li>
              <li>Score questions need at least two non-empty level strings.</li>
            </ul>
          </Section>

          <Section title="Errors">
            <p>
              The playground shows validation problems before a request is sent.
              Failed API calls may include <code>error</code> and{" "}
              <code>detail</code> in the results panel and in raw JSON—use those
              messages to fix state, questions, or your client payload.
            </p>
          </Section>
        </Card>
        </div>
      </div>
    </div>
  );
}
