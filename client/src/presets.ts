import type {
  PlaygroundPreset,
  PredictRequest,
  QuestionDraft,
  StateInputMode,
} from "./types";

export function newQuestionDraftKey(): string {
  return crypto.randomUUID();
}

export const INVOICE_PRESET: PlaygroundPreset = {
  name: "Invoice routing",
  description: "Route a billing email to the correct department.",
  stateText: JSON.stringify(
    { subject: "Need invoice", body: "Please send receipt for order #4821" },
    null,
    2,
  ),
  questions: [
    {
      draftKey: "preset-invoice-dept",
      id: "dept",
      type: "choice",
      instructions: "Route inquiry to the correct department",
      choiceCriteria: [
        {
          key: "billing",
          value: "Invoices, payment failures, double charges, refunds",
        },
        {
          key: "technical",
          value: "Software bugs, crashes, performance degradation",
        },
        {
          key: "sales",
          value: "Enterprise volume pricing, custom integrations",
        },
      ],
      scoreCriteria: ["", ""],
    },
  ],
};

export const SUPPORT_TICKET_PRESET: PlaygroundPreset = {
  name: "Support ticket",
  description: "Department, refund flag, and urgency in one request.",
  stateText: JSON.stringify(
    {
      subject: "Need invoice",
      body:
        "Please send receipt for order #4821. I was charged twice and need a refund today.",
    },
    null,
    2,
  ),
  questions: [
    {
      draftKey: "preset-support-department",
      id: "department",
      type: "choice",
      instructions: "Determine ticket department",
      choiceCriteria: [
        {
          key: "billing",
          value:
            "Invoices, receipts, payment questions, and duplicate charges",
        },
        {
          key: "engineering",
          value: "Application crashes, bugs, API errors",
        },
        {
          key: "sales",
          value: "Pricing plans, licensing, new accounts",
        },
      ],
      scoreCriteria: ["", ""],
    },
    {
      draftKey: "preset-support-refund",
      id: "refund_requested",
      type: "choice",
      instructions:
        "Determine if the user demands monetary compensation or refund",
      choiceCriteria: [
        {
          key: "true",
          value: "Explicit request for money back or refund",
        },
        {
          key: "false",
          value:
            "No refund requested, or explicit statement of no refund needed",
        },
      ],
      scoreCriteria: ["", ""],
    },
    {
      draftKey: "preset-support-urgency",
      id: "urgency",
      type: "score",
      instructions:
        "Score the customer turnaround deadline from lowest to highest",
      choiceCriteria: [{ key: "", value: "" }],
      scoreCriteria: [
        "Standard request with no specific timeframe",
        "Turnaround desired within a few business days",
        "Customer explicitly specifies same-day action, immediate turnaround, or today",
      ],
    },
  ],
};

export const PRESETS = [INVOICE_PRESET, SUPPORT_TICKET_PRESET];

export function newQuestionDraft(type: QuestionDraft["type"] = "choice"): QuestionDraft {
  return {
    draftKey: newQuestionDraftKey(),
    id: `q${Date.now()}`,
    type,
    instructions: "",
    choiceCriteria: [
      { key: "option_a", value: "Description A" },
      { key: "option_b", value: "Description B" },
    ],
    scoreCriteria: ["low", "medium", "high"],
  };
}

export function newBooleanChoiceDraft(id = `bool${Date.now()}`): QuestionDraft {
  return {
    draftKey: newQuestionDraftKey(),
    id,
    type: "choice",
    instructions: "Answer yes or no based on the state",
    choiceCriteria: [
      { key: "true", value: "Condition is met" },
      { key: "false", value: "Condition is not met" },
    ],
    scoreCriteria: ["", ""],
  };
}

export function readSubjectBody(
  stateText: string,
): { subject: string; body: string } | null {
  try {
    const parsed = JSON.parse(stateText);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    return {
      subject: typeof record.subject === "string" ? record.subject : "",
      body: typeof record.body === "string" ? record.body : "",
    };
  } catch {
    return null;
  }
}

export function formatNaturalState(subject: string, body: string): string {
  return JSON.stringify(
    { subject: subject.trim(), body: body.trim() },
    null,
    2,
  );
}

export function buildRequest(
  input: {
    mode: StateInputMode;
    stateText: string;
    subject: string;
    body: string;
  },
  questions: QuestionDraft[],
): { request: PredictRequest | null; error: string | null } {
  let state: PredictRequest["state"];

  if (input.mode === "natural") {
    const subject = input.subject.trim();
    const body = input.body.trim();
    if (!subject) {
      return { request: null, error: "Subject is required." };
    }
    if (!body) {
      return { request: null, error: "Body is required." };
    }
    state = { subject, body };
  } else {
    try {
      const parsed = JSON.parse(input.stateText);
      if (
        parsed === null ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return {
          request: null,
          error: "State must be a JSON object (not an array or plain string).",
        };
      }
      state = parsed as Record<string, unknown>;
    } catch {
      return {
        request: null,
        error: "State must be valid JSON object.",
      };
    }
  }

  if (Object.keys(state).length === 0) {
    return { request: null, error: "State cannot be empty." };
  }

  const builtQuestions: PredictRequest["questions"] = {};

  for (const q of questions) {
    const id = q.id.trim();
    if (!id) {
      return { request: null, error: "Every question needs an id." };
    }
    if (!q.instructions.trim()) {
      return { request: null, error: `Question "${id}" needs instructions.` };
    }

    if (q.type === "choice") {
      const criteria: Record<string, string> = {};
      for (const row of q.choiceCriteria) {
        const key = row.key.trim();
        if (!key) continue;
        criteria[key] = row.value.trim();
      }
      if (Object.keys(criteria).length === 0) {
        return {
          request: null,
          error: `Choice question "${id}" needs at least one option.`,
        };
      }
      const keys = Object.keys(criteria);
      const isBoolean =
        keys.length === 2 && keys.includes("true") && keys.includes("false");
      if (isBoolean) {
        if (!criteria.true?.trim() || !criteria.false?.trim()) {
          return {
            request: null,
            error: `Boolean choice "${id}" needs both true and false definitions.`,
          };
        }
      }
      builtQuestions[id] = {
        type: "choice",
        instructions: q.instructions.trim(),
        criteria,
      };
    } else if (q.type === "score") {
      const criteria = q.scoreCriteria.map((s) => s.trim()).filter(Boolean);
      if (criteria.length < 2) {
        return {
          request: null,
          error: `Score question "${id}" needs at least two levels.`,
        };
      }
      builtQuestions[id] = {
        type: "score",
        instructions: q.instructions.trim(),
        criteria,
      };
    }
  }

  if (Object.keys(builtQuestions).length === 0) {
    return { request: null, error: "Add at least one question." };
  }

  return { request: { state, questions: builtQuestions }, error: null };
}
