import React from "react";
import { createRoot } from "react-dom/client";
import type { ScopedDb } from "./appData";
import type { MiniApp } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Context object injected into every mini-app as `ctx`. */
export interface AppContext {
  appId: string;
  /** React apps mount their tree by calling this. */
  render: (node: React.ReactNode) => void;
}

export interface RunHandle {
  /** Tears the app down (unmounts React / clears the container). */
  cleanup: () => void;
}

const BABEL_CDN = "https://unpkg.com/@babel/standalone@7/babel.min.js";
let babelPromise: Promise<any> | null = null;

/** Lazily loads @babel/standalone from a CDN; only needed for React apps. */
function loadBabel(): Promise<any> {
  if ((window as any).Babel) return Promise.resolve((window as any).Babel);
  if (!babelPromise) {
    babelPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = BABEL_CDN;
      script.onload = () => resolve((window as any).Babel);
      script.onerror = () => reject(new Error("Failed to load Babel (JSX compiler) from CDN"));
      document.head.appendChild(script);
    });
  }
  return babelPromise;
}

/**
 * Executes a stored mini-app inside `container`.
 *
 * Security note: this uses `new Function(...)`, so apps run with full page
 * privileges. That is an accepted trade-off here because the "credentials" are a
 * publishable Firebase config (protected by Security Rules), not a secret.
 */
export async function runApp(
  app: MiniApp,
  container: HTMLElement,
  db: ScopedDb,
): Promise<RunHandle> {
  if (app.type === "react") return runReactApp(app, container, db);
  return runVanillaApp(app, container, db);
}

function runVanillaApp(app: MiniApp, container: HTMLElement, db: ScopedDb): RunHandle {
  container.replaceChildren();
  const ctx: AppContext = {
    appId: app.id,
    render: () => {
      throw new Error("ctx.render is only available in React apps; manipulate `root` instead.");
    },
  };
  // Signature: (root, db, ctx) — may optionally return a cleanup function.
  const fn = new Function("root", "db", "ctx", app.code);
  const maybeCleanup = fn(container, db, ctx);
  return {
    cleanup: () => {
      if (typeof maybeCleanup === "function") {
        try {
          maybeCleanup();
        } catch {
          /* ignore cleanup errors */
        }
      }
      container.replaceChildren();
    },
  };
}

async function runReactApp(
  app: MiniApp,
  container: HTMLElement,
  db: ScopedDb,
): Promise<RunHandle> {
  const Babel = await loadBabel();
  // Classic runtime keeps `React` in scope (we inject it below).
  const transformed: string = Babel.transform(app.code, {
    presets: [["react", { runtime: "classic" }]],
    filename: "app.jsx",
  }).code;

  const root = createRoot(container);
  const ctx: AppContext = { appId: app.id, render: (node) => root.render(node) };

  // Inject React + common hooks + db/ctx/render so apps can `render(<App/>)`.
  const fn = new Function(
    "React",
    "useState",
    "useEffect",
    "useRef",
    "useMemo",
    "useCallback",
    "db",
    "ctx",
    "render",
    transformed,
  );
  fn(
    React,
    React.useState,
    React.useEffect,
    React.useRef,
    React.useMemo,
    React.useCallback,
    db,
    ctx,
    ctx.render,
  );

  return { cleanup: () => root.unmount() };
}
