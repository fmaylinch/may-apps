"use client";

import { useCallback, useEffect, useState } from "react";
import { loadConfig, clearConfig } from "@/lib/firebase";
import { listApps } from "@/lib/appsRepo";
import type { MiniApp } from "@/lib/types";
import CredentialGate from "@/components/CredentialGate";
import AppEditor from "@/components/AppEditor";
import AppRunner from "@/components/AppRunner";
import styles from "./mayapps.module.css";

type EditorState = { open: false } | { open: true; app: MiniApp | null };

export default function Home() {
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const [running, setRunning] = useState<MiniApp | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setApps(await listApps());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // localStorage is client-only, so we read it after mount (avoids a hydration
  // mismatch) and then load apps. Both lines sync React with external systems.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const connected = loadConfig() !== null;
    setHasConfig(connected);
    if (connected) refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [refresh]);

  function resetCreds() {
    if (!confirm("Disconnect this Firebase project? Your stored apps stay in Firestore.")) return;
    clearConfig();
    window.location.reload();
  }

  if (hasConfig === null) return null; // brief pre-mount blank
  if (!hasConfig) return <CredentialGate />;

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <h1>MayApps</h1>
        <div className={styles.row}>
          <button className={styles.btn} onClick={resetCreds}>
            Disconnect
          </button>
          <button
            className={`${styles.btn} ${styles.primary}`}
            onClick={() => setEditor({ open: true, app: null })}
          >
            + New app
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          {"\n\n"}If this is a permissions error, check your Firestore Security Rules.
        </div>
      )}

      {loading ? (
        <p className={styles.muted}>Loading…</p>
      ) : apps.length === 0 ? (
        <div className={styles.empty}>
          <p>No apps yet.</p>
          <div className={styles.row} style={{ justifyContent: "center", marginTop: 12 }}>
            <button
              className={`${styles.btn} ${styles.primary}`}
              onClick={() => setEditor({ open: true, app: null })}
            >
              + New app
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.list}>
          {apps.map((app) => (
            <div
              key={app.id}
              className={styles.card}
              style={app.color ? { backgroundColor: app.color, borderColor: app.color } : undefined}
            >
              <div className={styles.cardMain}>
                <div className={styles.cardTitle}>
                  {app.name}
                  <span className={styles.tag}>{app.type}</span>
                </div>
                {app.description && <div className={styles.cardDesc}>{app.description}</div>}
              </div>
              <button
                className={`${styles.btn} ${styles.primary}`}
                onClick={() => setRunning(app)}
              >
                Run
              </button>
              <button className={styles.btn} onClick={() => setEditor({ open: true, app })}>
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {editor.open && (
        <AppEditor
          app={editor.app}
          onCancel={() => setEditor({ open: false })}
          onSaved={() => {
            setEditor({ open: false });
            refresh();
          }}
        />
      )}

      {running && <AppRunner app={running} onClose={() => setRunning(null)} />}
    </div>
  );
}
