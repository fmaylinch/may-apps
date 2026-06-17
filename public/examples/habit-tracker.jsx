// @name Habit Tracker
// @description React + JSX. Track daily habits in the scoped db.
// @type react

// Globals: React, useState, useEffect, db, ctx, render
// Mount your app by calling render(<App/>).

// Local date as "YYYY-MM-DD" (stable key for a given day)
function dayKey(d = new Date()) {
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
    ].join("-");
}

// Whole days between a stored day-key and today
function daysBetween(key) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [y, m, d] = key.split("-").map(Number);
    const then = new Date(y, m - 1, d); then.setHours(0, 0, 0, 0);
    return Math.round((today - then) / 86400000);
}

// A history entry is "YYYY-MM-DD" or "YYYY-MM-DD C" (C = a custom mark char)
function entryDay(entry) {
    return entry.slice(0, 10);
}
function entryMark(entry) {
    const c = entry.slice(10).trim();
    return c ? c[0] : "x";
}

function lastDoneLabel(history) {
    if (!history || history.length === 0) return "-";
    const last = history.slice().sort().at(-1); // most recent day
    const diff = daysBetween(entryDay(last));
    if (diff === 0) return "today";
    if (diff === 1) return "1 day ago";
    return diff + " days ago";
}

// "-x---F-" for the last `days` days (oldest first); "-" = missed,
// otherwise the day's mark char ("x" by default, or a custom one)
function recentStrip(history, days = 7) {
    const marks = {};
    for (const e of history || []) marks[entryDay(e)] = entryMark(e);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let out = "";
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        const key = dayKey(d);
        out += key in marks ? marks[key] : "-";
    }
    return out;
}

function App() {
    const [habits, setHabits] = useState([]);
    const [name, setName] = useState("");
    const [open, setOpen] = useState({}); // which habits have history expanded
    const [draft, setDraft] = useState({}); // editable history text per habit

    async function refresh() {
        setHabits(await db.list({ orderBy: ["name", "asc"] }));
    }

    useEffect(() => { refresh(); }, []);

    async function add(e) {
        e.preventDefault();
        if (!name.trim()) return;
        await db.create({ name: name.trim(), history: [], color: "#3498db", createdAt: Date.now() });
        setName("");
        refresh();
    }

    async function toggleToday(h) {
        const today = dayKey();
        const history = h.history || [];
        const next = history.some((e) => entryDay(e) === today)
            ? history.filter((e) => entryDay(e) !== today)   // un-check today
            : [...history, today];                           // mark done today
        await db.update(h.id, { history: next });
        refresh();
    }

    async function setColor(h, color) {
        await db.update(h.id, { color });
        refresh();
    }

    // Open initializes the textarea draft; closing parses + saves the edited days.
    async function toggleHistory(h) {
        if (open[h.id]) {
            const text = draft[h.id] ?? "";
            const days = [...new Set(
                text.split("\n").map((s) => s.trim()).filter(Boolean)
            )].sort();
            await db.update(h.id, { history: days });
            setOpen((o) => ({ ...o, [h.id]: false }));
            refresh();
        } else {
            const text = (h.history || []).slice().sort().reverse().join("\n");
            setDraft((d) => ({ ...d, [h.id]: text }));
            setOpen((o) => ({ ...o, [h.id]: true }));
        }
    }

    async function remove(h) {
        await db.remove(h.id);
        refresh();
    }

    const today = dayKey();

    return (
        <div style={{ fontFamily: "system-ui", maxWidth: 480 }}>
            <form onSubmit={add} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="New habit..."
                    style={{ flex: 1, padding: 8 }}
                />
                <button type="submit" style={{ padding: "8px 14px" }}>Add</button>
            </form>

            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {habits.map((h) => {
                    const history = h.history || [];
                    const doneToday = history.some((e) => entryDay(e) === today);
                    const isOpen = !!open[h.id];
                    return (
                        <li key={h.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <input
                                    type="checkbox"
                                    checked={doneToday}
                                    onChange={() => toggleToday(h)}
                                />
                                <input
                                    type="color"
                                    value={h.color || "lightgray"}
                                    onChange={(e) => setColor(h, e.target.value)}
                                    style={{ width: 28, height: 28, padding: 0, border: "none", background: "none", cursor: "pointer" }}
                                />
                                <span
                                    onClick={() => toggleToday(h)}
                                    style={{ flex: 1, fontWeight: 500, cursor: "pointer", userSelect: "none", color: h.color || "lightgray" }}
                                >
                  {h.name}
                </span>
                                <span
                                    title={lastDoneLabel(history)}
                                    style={{ fontFamily: "monospace", fontSize: 13, opacity: 0.6, letterSpacing: 1 }}
                                >
                                    {recentStrip(history)}
                                </span>
                                <button
                                    onClick={() => toggleHistory(h)}
                                    style={{ cursor: "pointer", padding: "0 7px" }}
                                >
                                    {isOpen ? "Save" : "History"}
                                </button>
                            </div>

                            {isOpen && (
                                <div style={{ margin: "6px 0 2px 26px", fontSize: 13 }}>
                                    <textarea
                                        value={draft[h.id] ?? ""}
                                        onChange={(e) => setDraft((d) => ({ ...d, [h.id]: e.target.value }))}
                                        placeholder={"One day per line with optional mark e.g. 2026-06-17 F"}
                                        rows={Math.max(3, (draft[h.id] ?? "").split("\n").length)}
                                        style={{ width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: 13, padding: 6 }}
                                    />
                                    <button
                                        onClick={() => remove(h)}
                                        style={{ cursor: "pointer", padding: "4px 10px", marginTop: 8, color: "#c0392b" }}
                                    >
                                        Delete habit
                                    </button>
                                </div>
                            )}
                        </li>
                    );
                })}
                {habits.length === 0 && <li style={{ opacity: 0.6 }}>No habits yet.</li>}
            </ul>
        </div>
    );
}

render(<App />);
