"use client";

import AppStage from "@/components/AppStage";
import type { MiniApp } from "@/lib/types";
import styles from "@/app/mayapps.module.css";

export default function AppRunner({ app, onClose }: { app: MiniApp; onClose: () => void }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} style={app.color ? { backgroundColor: app.color } : undefined} onClick={(e) => e.stopPropagation()}>
        <div className={styles.panelHeader}>
          <h2>{app.name}</h2>
          <button className={styles.btn} onClick={onClose}>
            Close
          </button>
        </div>
        <AppStage app={app} />
      </div>
    </div>
  );
}
