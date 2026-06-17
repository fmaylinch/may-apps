"use client";

import { useEffect, useRef, useState } from "react";
import { createScopedDb } from "@/lib/appData";
import { runApp, type RunHandle } from "@/lib/runner";
import type { MiniApp } from "@/lib/types";
import styles from "@/app/mayapps.module.css";

/**
 * Mounts a mini-app's UI into a stage element and surfaces any run error.
 * Shared by the modal runner (AppRunner) and inline list rendering.
 */
export default function AppStage({ app }: { app: MiniApp }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    // Each run gets its own fresh host node, so concurrent mounts (e.g. React
    // Strict Mode's dev double-invoke) never call createRoot on the same element.
    const host = document.createElement("div");
    stage.appendChild(host);

    let handle: RunHandle | null = null;
    let disposed = false;
    setError(null);

    (async () => {
      try {
        const db = createScopedDb(app.id);
        const result = await runApp(app, host, db);
        if (disposed) result.cleanup();
        else handle = result;
      } catch (err) {
        if (!disposed) {
          setError(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
        }
      }
    })();

    return () => {
      disposed = true;
      // Defer teardown so we never unmount a React root during React's own render.
      queueMicrotask(() => {
        handle?.cleanup();
        host.remove();
      });
    };
  }, [app]);

  return (
    <>
      {error && <div className={styles.error}>{error}</div>}
      <div
        className={styles.stage}
        style={app.color ? { background: "var(--background)" } : undefined}
        ref={stageRef}
      />
    </>
  );
}
