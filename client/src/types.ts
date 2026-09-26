export type QuestionType = "choice" | "score";

export interface ChoiceQuestion {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
}

export interface ScoreQuestion {
  type: "score";
  instructions: string;
  criteria: string[];
}

export type Question = ChoiceQuestion | ScoreQuestion;

export interface PredictRequest {
  state: Record<string, unknown>;
  questions: Record<string, Question>;
}

export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence?: number;
}

export interface ScoreAnswer {
  type: "score";
  score: number;
  choice?: string;
  probabilities: Record<string, number>;
  confidence?: number;
}

export type Answer = ChoiceAnswer | ScoreAnswer;

export interface PredictResponse {
  status?: "success" | "error" | string;
  answers?: Record<string, Answer>;
  error?: string;
  detail?: string;
}

export interface QuestionDraft {
  id: string;
  type: QuestionType;
  instructions: string;
  choiceCriteria: Array<{ key: string; value: string }>;
  scoreCriteria: string[];
}

export interface PlaygroundPreset {
  name: string;
  description: string;
  stateText: string;
  questions: QuestionDraft[];
}
