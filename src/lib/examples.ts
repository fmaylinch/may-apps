import type { AppType } from "./types";

/**
 * Example mini-apps live as real source files under `public/examples/`. Each
 * file is self-describing: a leading block of `// @key value` comment lines
 * carries its metadata. That folder is the single source of truth — the same
 * files power the New-app dialog templates, the "Add example apps" seeds, and
 * are directly pullable by URL (e.g. `/examples/todos-react.jsx`).
 *
 * Supported header tags:
 *   // @name         Display name
 *   // @description  One-line summary
 *   // @type         react | vanilla
 *   // @template     Offer as a starting point in the New-app dialog
 */
export interface ExampleMeta {
  slug: string;
  name: string;
  description: string;
  type: AppType;
  /** File name within `public/examples/`. */
  file: string;
  template: boolean;
}

/** Metadata parsed from an example's header comment. All fields optional. */
export interface ExampleHeader {
  name?: string;
  description?: string;
  type?: AppType;
  template: boolean;
}

/**
 * Read `// @key value` tags from the leading comment block of an example's
 * source. Scanning stops at the first line that is neither blank nor a `//`
 * comment, so tags must sit at the very top of the file.
 */
export function parseExampleHeader(code: string): ExampleHeader {
  const header: ExampleHeader = { template: false };
  for (const line of code.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue; // blank lines don't end the header block
    if (!trimmed.startsWith("//")) break; // first real code line ends it
    const m = /^\/\/\s*@(\w+)\b[ \t]*(.*)$/.exec(trimmed);
    if (!m) continue;
    const [, key, rawValue] = m;
    const value = rawValue.trim();
    switch (key) {
      case "name":
        header.name = value;
        break;
      case "description":
        header.description = value;
        break;
      case "type":
        if (value === "react" || value === "vanilla") header.type = value;
        break;
      case "template":
        header.template = value !== "false";
        break;
    }
  }
  return header;
}

/** Public URL the example's code can be pulled from. */
export function exampleCodeUrl(meta: ExampleMeta): string {
  return `/examples/${meta.file}`;
}

/**
 * Load the catalog of available examples (metadata only, no code). Enumerated
 * server-side from the `public/examples/` directory by the `/api/examples`
 * route.
 */
export async function loadExamples(): Promise<ExampleMeta[]> {
  const res = await fetch("/api/examples");
  if (!res.ok) throw new Error(`Could not load examples (${res.status}).`);
  return res.json();
}

/** Fetch one example's source code. */
export async function fetchExampleCode(meta: ExampleMeta): Promise<string> {
  const res = await fetch(exampleCodeUrl(meta));
  if (!res.ok) throw new Error(`Could not load "${meta.name}" (${res.status}).`);
  return res.text();
}
