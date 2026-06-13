// @name Offline Notes
// @description Notes that keep working offline and show a live sync badge.
// @type react

// Globals: React, useState, useEffect, db, ctx, render
// Demonstrates db.onStatus: writes queue offline and sync automatically.

function SyncBadge() {
  const [status, setStatus] = useState({ online: true, pending: false });

  // Subscribe once; db.onStatus fires immediately and on every change.
  useEffect(() => db.onStatus(setStatus), []);

  const { online, pending } = status;
  const label = !online
    ? "Offline — changes saved locally"
    : pending
      ? "Syncing…"
      : "All changes synced";
  const color = !online ? "#e5484d" : pending ? "#caa24a" : "#5ac46a";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
      <span>{label}</span>
    </div>
  );
}

function App() {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState("");

  async function refresh() {
    setNotes(await db.list({ orderBy: ["createdAt", "desc"] }));
  }

  useEffect(() => { refresh(); }, []);

  async function add(e) {
    e.preventDefault();
    if (!text.trim()) return;
    // Resolves instantly even offline; the write syncs in the background.
    await db.create({ text: text.trim(), createdAt: Date.now() });
    setText("");
    refresh();
  }

  async function remove(id) {
    await db.remove(id);
    refresh();
  }

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 480 }}>
      <SyncBadge />
      <form onSubmit={add} style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Try going offline, then add a note…"
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit" style={{ padding: "8px 14px" }}>Add</button>
      </form>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {notes.map((n) => (
          <li key={n.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
            <span>{n.text}</span>
            <button onClick={() => remove(n.id)} style={{ marginLeft: 12, padding: "0 7px" }}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

render(<App />);
