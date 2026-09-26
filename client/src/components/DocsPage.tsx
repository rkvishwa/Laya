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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <AppHeader
        sessionEmail={sessionEmail}
        sessionRole={sessionRole}
        configured={configured}
        currentPath="docs"
        onLogout={onLogout}
      />

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <p className="text-sm leading-relaxed text-slate-700">
            The Brainvave Decision Model evaluates structured context and returns
            answers to one or more questions in a single request. Each question is
            either a <strong>choice</strong> (pick one labeled option) or a{" "}
            <strong>score</strong> (ordinal level along a scale you define). Use
            the playground to compose requests interactively, or call the same
            JSON shape from your own integration through this app&apos;s proxy.
          </p>
        </Card>

        <Card className="space-y-6">
          <Section title="Getting started">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Sign in with admin credentials (
                <code>AUTH_EMAIL</code> / <code>AUTH_PASSWORD</code>) or, if
                enabled, the guest account configured on the server (
                <code>GUEST_EMAIL</code> / <code>GUEST_PASSWORD</code>).
              </li>
              <li>
                Open <strong>Playground</strong> and confirm the server shows as
                configured (requires <code>MODEL_BASE_URL</code> plus{" "}
                <code>MODEL_API_KEY</code> for admin or <code>GUEST_API</code>{" "}
                for guest sessions).
              </li>
              <li>
                Enter a <strong>state</strong> JSON object and add at least one
                question.
              </li>
              <li>
                Click <strong>Run query</strong> to see answers, probability
                bars, and raw JSON in the results panel.
              </li>
            </ol>
          </Section>

          <Section title="State">
            <p>
              <code>state</code> must be a non-empty JSON <strong>object</strong>{" "}
              (not an array or string). It is the shared context for every
              question in the request—emails, tickets, form fields, or any
              structured record your workflow needs.
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

          {docsInfo?.guestLoginEnabled && docsInfo.guestApiKey && (
            <Section title="Guest testing">
              <p>
                A guest account lets you try the decision API without admin
                credentials. Sign in with the guest email and password your
                operator configured (<code>GUEST_EMAIL</code> /{" "}
                <code>GUEST_PASSWORD</code>). Guest playground requests use the
                guest API key on the server; the key below is for direct API
                testing (for example with <code>curl</code>).
              </p>
              <p className="font-medium text-slate-900">Guest API key</p>
              <pre className="overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
                {docsInfo.guestApiKey}
              </pre>
              {docsInfo.predictUrl && (
                <>
                  <p className="font-medium text-slate-900">Example request</p>
                  <pre className="overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 whitespace-pre-wrap">
                    {buildCurlExample(docsInfo.predictUrl, docsInfo.guestApiKey)}
                  </pre>
                </>
              )}
            </Section>
          )}

          <Section title="Request shape">
            <p>
              The playground builds this payload and POSTs it to{" "}
              <code>/api/predict</code> (authenticated). The server forwards to
              your configured predict endpoint with the API key.
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
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                <h3 className="font-medium text-slate-900">
                  {INVOICE_PRESET.name}
                </h3>
                <p className="mt-1 text-slate-600">{INVOICE_PRESET.description}</p>
                <p className="mt-2 text-slate-600">
                  One choice question (<code>dept</code>) routing a billing email
                  to billing, technical, or sales.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
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
              The UI surfaces validation errors before the request is sent. API
              errors may include <code>error</code> and <code>detail</code>{" "}
              fields—check the results panel and raw JSON. A 503 usually means
              predict credentials are missing on the server; 401 means you need
              to sign in again.
            </p>
          </Section>
        </Card>
      </div>
    </div>
  );
}
