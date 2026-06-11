"use client";

import { useState } from "react";
import type { FirebaseOptions } from "firebase/app";
import { saveConfig } from "@/lib/firebase";
import styles from "@/app/mayapps.module.css";

const PLACEHOLDER = `{
  "apiKey": "AIza...",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project",
  "appId": "1:...:web:..."
}`;

export default function CredentialGate() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function connect() {
    setError(null);
    let config: FirebaseOptions;
    try {
      config = JSON.parse(text);
    } catch {
      setError("That isn't valid JSON. Paste the firebaseConfig object from your Firebase console.");
      return;
    }
    if (!config.projectId || !config.apiKey) {
      setError("Config is missing required fields (apiKey, projectId).");
      return;
    }
    saveConfig(config);
    // Reload so Firebase initializes cleanly from the saved config.
    window.location.reload();
  }

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <h1>MayApps</h1>
      </div>
      <p className={styles.muted}>
        Connect a Firebase project to store and run your mini-apps. Paste its web config
        (<code>firebaseConfig</code>) below — it&apos;s a publishable client config, not a secret,
        so it&apos;s kept in this browser&apos;s localStorage. Access is governed by your Firestore
        Security Rules.
      </p>

      <div className={styles.field}>
        <label className={styles.label}>Firebase config (JSON)</label>
        <textarea
          className={styles.textarea}
          style={{ minHeight: 200 }}
          value={text}
          placeholder={PLACEHOLDER}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.row}>
        <button className={`${styles.btn} ${styles.primary}`} onClick={connect}>
          Connect
        </button>
      </div>
    </div>
  );
}
