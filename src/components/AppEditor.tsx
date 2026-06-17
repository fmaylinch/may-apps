"use client";

import { useEffect, useState } from "react";
import CodeEditor from "@/components/CodeEditor";
import { createApp, updateApp, deleteApp, slugify } from "@/lib/appsRepo";
import { clearAppData } from "@/lib/appData";
import {
  loadExamples,
  fetchExampleCode,
  exampleCodeUrl,
  parseExampleHeader,
  type ExampleMeta,
} from "@/lib/examples";
import type { AppType, MiniApp } from "@/lib/types";
import styles from "@/app/mayapps.module.css";

// Prompt scaffold for handing a mini-app's code to an LLM. `<CODE>` is replaced
// with the editor contents when copied; everything else is editable beforehand.
const AI_PROMPT_TEMPLATE = `I have this code for a mini app.

\`\`\`
<CODE>
\`\`\`

Help me change the following and show me the full result.
I want to...`;

const STARTERS: Record<AppType, string> = {
  vanilla: `// Globals: root (HTMLElement), db (scoped), ctx
root.textContent = "Hello from a vanilla app!";
`,
  react: `// Globals: React, useState, useEffect, db, ctx, render
function App() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>Clicked {n}</button>;
}
render(<App />);
`,
};

export default function AppEditor({
  app,
  onSaved,
  onCancel,
}: {
  app: MiniApp | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(app?.name ?? "");
  const [slug, setSlug] = useState(app?.id ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState(app?.description ?? "");
  const [type, setType] = useState<AppType>(app?.type ?? "react");
  const [code, setCode] = useState(app?.code ?? STARTERS[app?.type ?? "react"]);
  const [sourceUrl, setSourceUrl] = useState(app?.sourceUrl ?? "");
  const [color, setColor] = useState(app?.color ?? "");
  const [inline, setInline] = useState(app?.inline ?? false);
  const [pulling, setPulling] = useState(false);
  const [action, setAction] = useState<"save" | "delete" | "clear" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [examples, setExamples] = useState<ExampleMeta[]>([]);
  const [showExamples, setShowExamples] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(AI_PROMPT_TEMPLATE);
  const [aiCopied, setAiCopied] = useState(false);
  const busy = action !== null;

  // Load the example catalog once so it can be offered from the Examples button.
  useEffect(() => {
    loadExamples()
      .then(setExamples)
      .catch(() => {}); // non-fatal: the dialog still works without examples
  }, []);

  function changeType(next: AppType) {
    setType(next);
    // Swap in the starter only if the user hasn't written anything custom.
    if (!code.trim() || code === STARTERS.vanilla || code === STARTERS.react) {
      setCode(STARTERS[next]);
    }
  }

  // While creating, keep the slug mirrored from the name until the user edits it by hand.
  function changeName(next: string) {
    setName(next);
    if (!app && !slugEdited) setSlug(slugify(next));
  }

  function changeSlug(next: string) {
    setSlugEdited(true);
    setSlug(next.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  }

  async function applyExample(meta: ExampleMeta) {
    setName(meta.name);
    if (!slugEdited) setSlug(slugify(meta.name));
    setDescription(meta.description);
    setType(meta.type);
    // Keep the example's URL in the input so it can be re-pulled later.
    setSourceUrl(exampleCodeUrl(meta));
    setError(null);
    try {
      setCode(await fetchExampleCode(meta));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function pullFromUrl() {
    const url = sourceUrl.trim();
    if (!url) {
      setError("Enter a URL to pull code from.");
      return;
    }
    // Resolve relative URLs (e.g. "/examples/foo.jsx") against our own origin so
    // the same string works in dev, preview, and prod.
    let resolved: URL;
    try {
      resolved = new URL(url, window.location.origin);
    } catch {
      setError("Invalid URL.");
      return;
    }
    setPulling(true);
    setError(null);
    try {
      let code: string;
      if (resolved.origin === window.location.origin) {
        // Same-origin (e.g. bundled examples): fetch directly, no proxy needed.
        const res = await fetch(resolved);
        if (!res.ok) throw new Error(`Failed to fetch (${res.status} ${res.statusText}).`);
        code = await res.text();
      } else {
        // Cross-origin: go through the server proxy to dodge CORS.
        const res = await fetch(`/api/fetch-code?url=${encodeURIComponent(resolved.href)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Failed to fetch (${res.status}).`);
        code = data.code;
      }
      // Adopt any metadata the source declares in its header comment.
      const header = parseExampleHeader(code);
      if (header.name) {
        setName(header.name);
        if (!slugEdited) setSlug(slugify(header.name));
      }
      if (header.description) setDescription(header.description);
      if (header.type) setType(header.type);
      setCode(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPulling(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function clearCode() {
    if (code.trim() && !confirm("Clear the code editor?")) return;
    setCode("");
  }

  async function copyAiPrompt() {
    try {
      await navigator.clipboard.writeText(aiPrompt.replace("<CODE>", code));
      setAiCopied(true);
      setTimeout(() => {
        setAiCopied(false);
        setShowAiPrompt(false);
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function save() {
    if (!name.trim()) {
      setError("Give the app a name.");
      return;
    }
    if (!app && !slug) {
      setError("Give the app a valid id (slug).");
      return;
    }
    setAction("save");
    setError(null);
    try {
      const draft = { name: name.trim(), description: description.trim(), type, code, sourceUrl: sourceUrl.trim(), color, inline };
      if (app) await updateApp(app.id, draft);
      else await createApp(slug, draft);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setAction(null);
    }
  }

  async function remove() {
    if (!app || !confirm(`Delete "${app.name}"? This cannot be undone.`)) return;
    setAction("delete");
    try {
      await deleteApp(app.id);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setAction(null);
    }
  }

  async function removeData() {
    if (!app || !confirm(`Delete all data stored by "${app.name}"? This cannot be undone.`)) return;
    setAction("clear");
    setError(null);
    try {
      const count = await clearAppData(app.id);
      alert(`Deleted ${count} item${count === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAction(null);
    }
  }

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.panelHeader}>
          <h2>{app ? "Edit app" : "New app"}</h2>
          <button className={styles.btn} onClick={onCancel}>
            Cancel
          </button>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Name</label>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => changeName(e.target.value)}
            placeholder="My mini-app"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>ID</label>
          {app ? (
            <input className={styles.input} value={app.id} disabled />
          ) : (
            <input
              className={styles.input}
              value={slug}
              onChange={(e) => changeSlug(e.target.value)}
              placeholder="my-mini-app"
            />
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <input
            className={styles.input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What it does"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Color</label>
          <div className={styles.row}>
            <input
              type="color"
              className={styles.colorInput}
              value={color || "#6366f1"}
              onChange={(e) => setColor(e.target.value)}
            />
            {color ? (
              <button type="button" className={styles.btn} onClick={() => setColor("")}>
                Clear color
              </button>
            ) : (
              <span className={styles.muted}>No color</span>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Type</label>
          <select
            className={styles.select}
            value={type}
            onChange={(e) => changeType(e.target.value as AppType)}
          >
            <option value="react">React (JSX)</option>
            <option value="vanilla">Vanilla JS</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={inline}
              onChange={(e) => setInline(e.target.checked)}
            />
            Display inline in the list (no Run button)
          </label>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Code</label>
          <div className={styles.row}>
            <input
              className={styles.input}
              style={{ flex: 1, minWidth: 0 }}
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") pullFromUrl();
              }}
              placeholder="https://example.com/app.js"
            />
            {examples.length > 0 && (
              <button
                type="button"
                className={styles.btn}
                onClick={() => setShowExamples((v) => !v)}
              >
                Examples
              </button>
            )}
            <button
              type="button"
              className={styles.btn}
              onClick={pullFromUrl}
              disabled={pulling || !sourceUrl.trim()}
            >
              {pulling ? "Pulling…" : "Pull"}
            </button>
          </div>
          {showExamples && examples.length > 0 && (
            <select
              className={styles.select}
              value=""
              onChange={(e) => {
                const meta = examples.find((x) => x.slug === e.target.value);
                if (meta) applyExample(meta);
                setShowExamples(false);
              }}
            >
              <option value="" disabled>
                Choose an example…
              </option>
              {examples.map((x) => (
                <option key={x.slug} value={x.slug}>
                  {x.name}
                </option>
              ))}
            </select>
          )}
          <CodeEditor value={code} onChange={setCode} />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.row}>
          <button type="button" className={styles.btn} onClick={copyCode}>
            {copied ? "Copied!" : "Copy code"}
          </button>
          <button type="button" className={styles.btn} onClick={() => setShowAiPrompt(true)}>
            Copy for AI
          </button>
          <button type="button" className={styles.btn} onClick={clearCode}>
            Clear code
          </button>
        </div>

        <div className={styles.row}>
          <button className={`${styles.btn} ${styles.primary}`} onClick={save} disabled={busy}>
            {action === "save" ? "Saving…" : "Save"}
          </button>
          <div className={styles.spacer} />
          {app && (
            <>
              <button
                className={`${styles.btn} ${styles.danger}`}
                onClick={removeData}
                disabled={busy}
              >
                {action === "clear" ? "Deleting data…" : "Delete data"}
              </button>
              <button className={`${styles.btn} ${styles.danger}`} onClick={remove} disabled={busy}>
                {action === "delete" ? "Deleting…" : "Delete"}
              </button>
            </>
          )}
        </div>

        {showAiPrompt && (
          <div
            className={styles.overlay}
            style={{ zIndex: 60 }}
            onClick={() => setShowAiPrompt(false)}
          >
            <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
              <div className={styles.panelHeader}>
                <h2>Copy for AI</h2>
                <button className={styles.btn} onClick={() => setShowAiPrompt(false)}>
                  Cancel
                </button>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  Prompt — <code>&lt;CODE&gt;</code> is replaced with the editor contents
                </label>
                <textarea
                  className={styles.input}
                  style={{
                    minHeight: 220,
                    resize: "vertical",
                    fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                  }}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
              </div>
              <div className={styles.row}>
                <button
                  className={`${styles.btn} ${styles.primary}`}
                  onClick={copyAiPrompt}
                >
                  {aiCopied ? "Copied!" : "Copy"}
                </button>
                <button className={styles.btn} onClick={() => setAiPrompt(AI_PROMPT_TEMPLATE)}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
