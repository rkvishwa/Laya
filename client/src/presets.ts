import type { PlaygroundPreset, PredictRequest, QuestionDraft } from "./types";

export const INVOICE_PRESET: PlaygroundPreset = {
  name: "Invoice routing",
  description: "Route a billing email to the right team.",
  stateText: JSON.stringify(
    { subject: "Need invoice", body: "Please send receipt" },
    null,
    2,
  ),
  questions: [
    {
      id: "dept",
      type: "choice",
      instructions: "Route team",
      choiceCriteria: [
        { key: "billing", value: "invoice and refund" },
        { key: "tech", value: "bugs" },
      ],
      scoreCriteria: ["", ""],
      noulTrue: "",
      noulFalse: "",
    },
  ],
};

export const FULL_PRESET: PlaygroundPreset = {
  name: "Invoice + urgency + refund",
  description: "All three question types in one request.",
  stateText: JSON.stringify(
    {
      subject: "Need invoice",
      body: "Please send receipt for order #4821. I was charged twice and need a refund today.",
    },
    null,
    2,
  ),
  questions: [
    {
      id: "dept",
      type: "choice",
      instructions: "Route team",
      choiceCriteria: [
        { key: "billing", value: "invoice and refund" },
        { key: "tech", value: "bugs" },
        { key: "sales", value: "pricing or new accounts" },
      ],
      scoreCriteria: ["", ""],
      noulTrue: "",
      noulFalse: "",
    },
    {
      id: "urgency",
      type: "score",
      instructions: "How urgent is this message?",
      choiceCriteria: [{ key: "", value: "" }],
      scoreCriteria: ["not urgent", "soon", "critical deadline"],
      noulTrue: "",
      noulFalse: "",
    },
    {
      id: "refund_requested",
      type: "noul",
      instructions: "Does the customer explicitly request a refund?",
      choiceCriteria: [{ key: "", value: "" }],
      scoreCriteria: ["", ""],
      noulTrue: "Customer asks for money back",
      noulFalse: "No refund request",
    },
  ],
};

export const PRESETS = [INVOICE_PRESET, FULL_PRESET];

export function newQuestionDraft(type: QuestionDraft["type"] = "choice"): QuestionDraft {
  return {
    id: `q${Date.now()}`,
    type,
    instructions: "",
    choiceCriteria: [
      { key: "option_a", value: "Description A" },
      { key: "option_b", value: "Description B" },
    ],
    scoreCriteria: ["low", "medium", "high"],
    noulTrue: "",
    noulFalse: "",
  };
}

export function buildRequest(
  stateText: string,
  questions: QuestionDraft[],
): { request: PredictRequest | null; error: string | null } {
  let state: PredictRequest["state"];
  try {
    const parsed = JSON.parse(stateText);
    state = typeof parsed === "string" ? parsed : parsed;
  } catch {
    const trimmed = stateText.trim();
    if (!trimmed) {
      return { request: null, error: "State cannot be empty." };
    }
    state = trimmed;
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
    } else {
      const question: PredictRequest["questions"][string] = {
        type: "noul",
        instructions: q.instructions.trim(),
      };
      const trueDesc = q.noulTrue.trim();
      const falseDesc = q.noulFalse.trim();
      if (trueDesc || falseDesc) {
        question.criteria = {};
        if (trueDesc) question.criteria.true = trueDesc;
        if (falseDesc) question.criteria.false = falseDesc;
      }
      builtQuestions[id] = question;
    }
  }

  if (Object.keys(builtQuestions).length === 0) {
    return { request: null, error: "Add at least one question." };
  }

  return { request: { state, questions: builtQuestions }, error: null };
}
