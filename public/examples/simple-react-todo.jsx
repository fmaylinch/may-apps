// Globals: React, useState, useEffect, db, ctx, render

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
