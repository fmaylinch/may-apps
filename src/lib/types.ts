export type AppType = "react" | "vanilla";

export interface MiniApp {
  id: string;
  name: string;
  description: string;
  type: AppType;
  code: string;
  /** URL the code was last pulled from, if any. */
  sourceUrl?: string;
  createdAt: number;
  updatedAt: number;
}

/** Fields the user edits; id and timestamps are managed by the repo. */
export type AppDraft = Pick<MiniApp, "name" | "description" | "type" | "code" | "sourceUrl">;
