import type { AppDraft } from "./types";

/** Seed apps that demonstrate both app types and the scoped `db` API. */
export const EXAMPLE_APPS: AppDraft[] = [
  {
    name: "Counter (vanilla)",
    description: "Plain JS + DOM. Persists its count via the scoped db.",
    type: "vanilla",
    code: `// Globals: root (HTMLElement), db (scoped), ctx
// db.list/get/create/update/remove operate on THIS app's data only.

(async () => {
  // Find our single counter doc, or create it on first run.
  const existing = await db.list({ limit: 1 });
  let docId, value;
  if (existing.length) {
    docId = existing[0].id;
    value = existing[0].value ?? 0;
  } else {
    docId = await db.create({ value: 0 });
    value = 0;
  }

  const label = document.createElement("p");
  label.style.cssText = "font-size:28px;margin:0 0 12px";

  const btn = document.createElement("button");
  btn.textContent = "+1";
  btn.style.cssText = "padding:8px 16px;cursor:pointer";

  const render = () => { label.textContent = "Count: " + value; };

  btn.onclick = async () => {
    value += 1;
    render();
    await db.update(docId, { value });
  };

  render();
  root.append(label, btn);
})();
`,
  },
  {
    name: "Todos (React)",
    description: "React + JSX. CRUDs todo items in the scoped db.",
    type: "react",
    code: `// Globals: React, useState, useEffect, db, ctx, render
// Mount your app by calling render(<App/>).

function App() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState("");

  async function refresh() {
    setTodos(await db.list({ orderBy: ["createdAt", "desc"] }));
  }

  useEffect(() => { refresh(); }, []);

  async function add(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await db.create({ text: text.trim(), done: false, createdAt: Date.now() });
    setText("");
    refresh();
  }

  async function toggle(t) {
    await db.update(t.id, { done: !t.done });
    refresh();
  }

  async function remove(t) {
    await db.remove(t.id);
    refresh();
  }

  return (
    <div style={{ fontFamily: "system-ui" }}>
      <form onSubmit={add} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="New todo..."
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit" style={{ padding: "8px 14px" }}>Add</button>
      </form>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {todos.map((t) => (
          <li key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t)} />
            <span style={{ flex: 1, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
            <button onClick={() => remove(t)} style={{ cursor: "pointer" }}>✕</button>
          </li>
        ))}
        {todos.length === 0 && <li style={{ opacity: 0.6 }}>No todos yet.</li>}
      </ul>
    </div>
  );
}

render(<App />);
`,
  },
];

export interface Template {
  label: string;
  draft: AppDraft;
}

/**
 * Ready-made starting points offered in the New app dialog. Kept deliberately
 * minimal so they're easy to read and tweak.
 */
export const TEMPLATES: Template[] = [
  {
    label: "Simple ToDo (React)",
    draft: {
      name: "Simple ToDo",
      description: "A minimal React todo list backed by the scoped db.",
      type: "react",
      code: `// Globals: React, useState, useEffect, db, ctx, render

function App() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState("");

  async function load() {
    setTodos(await db.list({ orderBy: ["createdAt", "desc"] }));
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!text.trim()) return;
    await db.create({ text: text.trim(), createdAt: Date.now() });
    setText("");
    load();
  }

  async function remove(id) {
    await db.remove(id);
    load();
  }

  return (
    <div style={{ fontFamily: "system-ui" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="New todo..."
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={add} style={{ padding: "8px 14px" }}>Add</button>
      </div>
      <ul style={{ paddingLeft: 18 }}>
        {todos.map((t) => (
          <li key={t.id}>
            {t.text}{" "}
            <button onClick={() => remove(t.id)} style={{ cursor: "pointer" }}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

render(<App />);
`,
    },
  },
  {
    label: "Simple ToDo (vanilla)",
    draft: {
      name: "Simple ToDo",
      description: "A minimal vanilla-JS todo list backed by the scoped db.",
      type: "vanilla",
      code: `// Globals: root (HTMLElement), db (scoped), ctx

(async () => {
  const input = document.createElement("input");
  input.placeholder = "New todo...";
  input.style.cssText = "padding:8px;margin-right:8px";

  const addBtn = document.createElement("button");
  addBtn.textContent = "Add";
  addBtn.style.cssText = "padding:8px 14px;cursor:pointer";

  const list = document.createElement("ul");
  list.style.paddingLeft = "18px";

  async function render() {
    const todos = await db.list({ orderBy: ["createdAt", "desc"] });
    list.replaceChildren();
    for (const t of todos) {
      const li = document.createElement("li");
      li.textContent = t.text + " ";
      const del = document.createElement("button");
      del.textContent = "✕";
      del.style.cursor = "pointer";
      del.onclick = async () => { await db.remove(t.id); render(); };
      li.append(del);
      list.append(li);
    }
  }

  addBtn.onclick = async () => {
    if (!input.value.trim()) return;
    await db.create({ text: input.value.trim(), createdAt: Date.now() });
    input.value = "";
    render();
  };

  root.append(input, addBtn, list);
  render();
})();
`,
    },
  },
];
