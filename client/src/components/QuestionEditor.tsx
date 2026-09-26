import { newBooleanChoiceDraft } from "../presets";
import type { QuestionDraft } from "../types";
import { Button } from "./ui/Button";
import { Input, Label, Select, Textarea } from "./ui/Field";

interface Props {
  questions: QuestionDraft[];
  onChange: (questions: QuestionDraft[]) => void;
}

export function QuestionEditor({ questions, onChange }: Props) {
  function update(id: string, patch: Partial<QuestionDraft>) {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function remove(id: string) {
    onChange(questions.filter((q) => q.id !== id));
  }

  function add(type: QuestionDraft["type"]) {
    const base: QuestionDraft = {
      id: `q${questions.length + 1}`,
      type,
      instructions: "",
      choiceCriteria: [
        { key: "option_a", value: "Description A" },
        { key: "option_b", value: "Description B" },
      ],
      scoreCriteria: ["low", "medium", "high"],
    };
    onChange([...questions, base]);
  }

  function addBoolean() {
    onChange([...questions, newBooleanChoiceDraft(`q${questions.length + 1}`)]);
  }

  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-slate-900">Questions</h3>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => add("choice")}>
            + Choice
          </Button>
          <Button type="button" variant="ghost" onClick={() => add("score")}>
            + Score
          </Button>
          <Button type="button" variant="ghost" onClick={addBoolean}>
            + Boolean
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((q) => (
          <div
            key={q.id}
            className="rounded-lg border border-slate-200 bg-slate-50/80 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
              <Label>
                Id
                <Input
                  value={q.id}
                  onChange={(e) => update(q.id, { id: e.target.value })}
                  placeholder="dept"
                />
              </Label>
              <Label>
                Type
                <Select
                  value={q.type}
                  onChange={(e) =>
                    update(q.id, { type: e.target.value as QuestionDraft["type"] })
                  }
                >
                  <option value="choice">choice</option>
                  <option value="score">score</option>
                </Select>
              </Label>
              <Button
                type="button"
                variant="danger"
                onClick={() => remove(q.id)}
                aria-label="Remove question"
              >
                Remove
              </Button>
            </div>

            <Label className="mt-3">
              Instructions
              <Textarea
                rows={2}
                className="font-sans"
                value={q.instructions}
                onChange={(e) => update(q.id, { instructions: e.target.value })}
                placeholder="What should the model decide?"
              />
            </Label>

            {q.type === "choice" && (
              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Options</span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="py-1"
                    onClick={() =>
                      update(q.id, {
                        choiceCriteria: [...q.choiceCriteria, { key: "", value: "" }],
                      })
                    }
                  >
                    + Option
                  </Button>
                </div>
                <div className="space-y-2">
                  {q.choiceCriteria.map((row, idx) => (
                    <div
                      key={idx}
                      className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]"
                    >
                      <Input
                        value={row.key}
                        onChange={(e) => {
                          const next = [...q.choiceCriteria];
                          next[idx] = { ...next[idx], key: e.target.value };
                          update(q.id, { choiceCriteria: next });
                        }}
                        placeholder="billing"
                      />
                      <Input
                        value={row.value}
                        onChange={(e) => {
                          const next = [...q.choiceCriteria];
                          next[idx] = { ...next[idx], value: e.target.value };
                          update(q.id, { choiceCriteria: next });
                        }}
                        placeholder="invoice and refund"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2"
                        onClick={() =>
                          update(q.id, {
                            choiceCriteria: q.choiceCriteria.filter((_, i) => i !== idx),
                          })
                        }
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  For yes/no decisions, use keys{" "}
                  <code className="rounded bg-slate-200 px-1">true</code> and{" "}
                  <code className="rounded bg-slate-200 px-1">false</code> with
                  concrete definitions.
                </p>
              </div>
            )}

            {q.type === "score" && (
              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">
                    Levels (ordered)
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="py-1"
                    onClick={() =>
                      update(q.id, { scoreCriteria: [...q.scoreCriteria, ""] })
                    }
                  >
                    + Level
                  </Button>
                </div>
                <div className="space-y-2">
                  {q.scoreCriteria.map((level, idx) => (
                    <div
                      key={idx}
                      className="grid gap-2 sm:grid-cols-[2rem_1fr_auto]"
                    >
                      <span className="flex items-center justify-center text-sm text-slate-500">
                        {idx}
                      </span>
                      <Input
                        value={level}
                        onChange={(e) => {
                          const next = [...q.scoreCriteria];
                          next[idx] = e.target.value;
                          update(q.id, { scoreCriteria: next });
                        }}
                        placeholder="Describe this level"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2"
                        onClick={() =>
                          update(q.id, {
                            scoreCriteria: q.scoreCriteria.filter((_, i) => i !== idx),
                          })
                        }
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
