"use client";

import { useEffect, useState } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
import styles from "@/app/mayapps.module.css";

// JSX + TS-aware highlighting; covers both vanilla JS and React apps.
const language = javascript({ jsx: true, typescript: true });

// Make CodeMirror inherit the app's mono font and sit flush in our field box.
const appearance = EditorView.theme({
  "&": { fontSize: "13px", backgroundColor: "transparent" },
  ".cm-content": {
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  },
  ".cm-gutters": { backgroundColor: "transparent", border: "none" },
  "&.cm-focused": { outline: "none" },
});

export default function CodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  // Follow the system color scheme, same as the rest of the app.
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setDark(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div className={styles.editor}>
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={dark ? githubDark : githubLight}
        extensions={[language, appearance]}
        height="100%"
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          indentOnInput: true,
          tabSize: 2,
        }}
      />
    </div>
  );
}
