// @name Todos (React)
// @description React + JSX. CRUDs todo items in the scoped db.
// @type react
// @seed

// Globals: React, useState, useEffect, db, ctx, render
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
