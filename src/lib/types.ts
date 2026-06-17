export type AppType = "react" | "vanilla";

export interface MiniApp {
  id: string;
  name: string;
  description: string;
  type: AppType;
  code: string;
  /** URL the code was last pulled from, if any. */
  sourceUrl?: string;
  /** Optional accent color (hex string, e.g. "#6366f1"). */
  color?: string;
  /** When true, the app runs inline in the list instead of behind a Run button. */
  inline?: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Fields the user edits; id and timestamps are managed by the repo. */
export type AppDraft = Pick<
  MiniApp,
  "name" | "description" | "type" | "code" | "sourceUrl" | "color" | "inline"
>;
