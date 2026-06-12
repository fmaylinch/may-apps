import type { AppDraft, AppType } from "./types";

/**
 * Example mini-apps live as real source files under `public/examples/`, listed
 * in `public/examples/index.json`. That folder is the single source of truth:
 * the same files power the New-app dialog templates, the "Add example apps"
 * seeds, and are directly pullable by URL (e.g. `/examples/todos-react.jsx`).
 */
export interface ExampleMeta {
  slug: string;
  name: string;
  description: string;
  type: AppType;
  /** File name within `public/examples/`. */
  file: string;
  /** Offered as a starting point in the New-app dialog. */
  template: boolean;
  /** Included when seeding via "Add example apps". */
  seed: boolean;
}

const MANIFEST_URL = "/examples/index.json";

/** Public URL the example's code can be pulled from. */
export function exampleCodeUrl(meta: ExampleMeta): string {
  return `/examples/${meta.file}`;
}

/** Load the manifest of available examples (metadata only, no code). */
export async function loadExamples(): Promise<ExampleMeta[]> {
  const res = await fetch(MANIFEST_URL);
  if (!res.ok) throw new Error(`Could not load examples (${res.status}).`);
  return res.json();
}

/** Fetch one example's source code. */
export async function fetchExampleCode(meta: ExampleMeta): Promise<string> {
  const res = await fetch(exampleCodeUrl(meta));
  if (!res.ok) throw new Error(`Could not load "${meta.name}" (${res.status}).`);
  return res.text();
}

/** Fetch one example as a ready-to-save draft (metadata + code). */
export async function loadExampleDraft(meta: ExampleMeta): Promise<AppDraft> {
  const code = await fetchExampleCode(meta);
  return { name: meta.name, description: meta.description, type: meta.type, code };
}
