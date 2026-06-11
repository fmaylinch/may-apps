"use client";

import { useState } from "react";
import CodeEditor from "@/components/CodeEditor";
import { createApp, updateApp, deleteApp } from "@/lib/appsRepo";
import { clearAppData } from "@/lib/appData";
import { TEMPLATES, type Template } from "@/lib/examples";
import type { AppType, MiniApp } from "@/lib/types";
import styles from "@/app/mayapps.module.css";

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
  const [description, setDescription] = useState(app?.description ?? "");
  const [type, setType] = useState<AppType>(app?.type ?? "react");
  const [code, setCode] = useState(app?.code ?? STARTERS[app?.type ?? "react"]);
  const [action, setAction] = useState<"save" | "delete" | "clear" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = action !== null;

  function changeType(next: AppType) {
    setType(next);
    // Swap in the starter only if the user hasn't written anything custom.
    if (!code.trim() || code === STARTERS.vanilla || code === STARTERS.react) {
      setCode(STARTERS[next]);
    }
  }

  function applyTemplate(t: Template) {
    setName(t.draft.name);
    setDescription(t.draft.description);
    setType(t.draft.type);
    setCode(t.draft.code);
  }

  async function save() {
    if (!name.trim()) {
      setError("Give the app a name.");
      return;
    }
    setAction("save");
    setError(null);
    try {
      const draft = { name: name.trim(), description: description.trim(), type, code };
      if (app) await updateApp(app.id, draft);
      else await createApp(draft);
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

        {!app && (
          <div className={styles.field}>
            <label className={styles.label}>Start from a template</label>
            <div className={styles.row}>
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  className={styles.btn}
                  onClick={() => applyTemplate(t)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label}>Name</label>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My mini-app"
          />
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
          <label className={styles.label}>Code</label>
          <CodeEditor value={code} onChange={setCode} />
        </div>

        {error && <div className={styles.error}>{error}</div>}

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
      </div>
    </div>
  );
}
