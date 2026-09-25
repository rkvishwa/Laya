export type QuestionType = "choice" | "score" | "noul";

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

export interface NoulQuestion {
  type: "noul";
  instructions: string;
  criteria?: { true?: string; false?: string };
}

export type Question = ChoiceQuestion | ScoreQuestion | NoulQuestion;

export type StateValue = string | Record<string, unknown>;

export interface PredictRequest {
  state: StateValue;
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
  legend?: Record<string, string>;
  choice?: string;
  probabilities: Record<string, number>;
  confidence?: number;
}

export interface NoulAnswer {
  type: "noul";
  noul?: number;
  choice?: string;
  confidence?: number;
  probabilities?: Record<string, number>;
}

export type Answer = ChoiceAnswer | ScoreAnswer | NoulAnswer;

export interface PredictResponse {
  model?: string;
  answers?: Record<string, Answer>;
  usage?: { input_tokens?: number; output_tokens?: number };
  routing?: Record<string, unknown>;
  error?: string;
  detail?: string;
}

export interface QuestionDraft {
  id: string;
  type: QuestionType;
  instructions: string;
  choiceCriteria: Array<{ key: string; value: string }>;
  scoreCriteria: string[];
  noulTrue: string;
  noulFalse: string;
}

export interface PlaygroundPreset {
  name: string;
  description: string;
  stateText: string;
  questions: QuestionDraft[];
}
