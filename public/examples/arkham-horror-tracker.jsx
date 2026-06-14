// @name Arkham Horror Tracker
// @description Tracks Arkham Horror progress and points.
// @type react

// Globals: React, useState, useEffect, db, ctx, render

// ── Counter colors — reused across types ──
const COLORS = {
    actions:   "#eef0f2", // white
    health:    "#e5484d", // red
    horror:    "#4a9bf2", // blue
    clues:     "#5ac46a", // green
    resources: "#f2c94c", // yellow
    doom:      "#b072f0", // violet
    act:       "#7fa386", // greyish green
    agenda:    "#9b8fb5", // greyish violet
};

// ── The unified model: every element is just "a thing with counters" ──
const TYPES = {
    scenario: {
        label: "Scenario",
        counters: [
            { key: "act",    label: "Act",    color: COLORS.act },
            { key: "agenda", label: "Agenda", color: COLORS.agenda },
            { key: "doom",   label: "Doom",   color: COLORS.doom },
        ],
        hasLocation: false,
    },
    location: {
        label: "Location",
        counters: [{ key: "clues", label: "Clues", color: COLORS.clues }],
        hasLocation: false,
    },
    enemy: {
        label: "Enemy",
        counters: [
            { key: "health", label: "Health", color: COLORS.health },
            { key: "doom",   label: "Doom",   color: COLORS.doom },
        ],
        hasLocation: true,
    },
    player: {
        label: "Investigator",
        counters: [
            { key: "actions",   label: "Actions",   color: COLORS.actions },
            { key: "health",    label: "Health",    color: COLORS.health },
            { key: "horror",    label: "Horror",    color: COLORS.horror },
            { key: "clues",     label: "Clues",     color: COLORS.clues },
            { key: "resources", label: "Resources", color: COLORS.resources },
        ],
        hasLocation: true,
    },
};

const C = {
    card: "#1e2127", border: "#2a2e37",
    text: "#e8e8ea", muted: "#8a8f98", accent: "#6cc24a",
};
const stepBtn = { width: 30, height: 30, borderRadius: 6, border: "none",
    background: "#2a2e37", color: C.text, fontSize: 18, fontWeight: 700, cursor: "pointer", lineHeight: 1 };
const inputS = { flex: 1, padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`,
    background: "#16181d", color: C.text, fontSize: 14 };
const addBtn = { padding: "8px 16px", borderRadius: 6, border: "none",
    background: C.accent, color: "#0c1108", fontWeight: 700, cursor: "pointer" };
const selectS = { padding: "5px 8px", borderRadius: 6, border: `1px solid ${C.border}`,
    background: "#16181d", color: C.text, fontSize: 13 };
const cardS = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 10 };

function Counter({ label, value, color, onDelta }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 62 }}>
            <span style={{ fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", color: C.muted }}>{label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => onDelta(-1)} style={stepBtn}>–</button>
                <span style={{ minWidth: 22, textAlign: "center", fontSize: 20, fontWeight: 700, color }}>{value}</span>
                <button onClick={() => onDelta(1)} style={stepBtn}>+</button>
            </div>
        </div>
    );
}

// ── One card renders ANY element type ──
function ElementCard({ el, type, locations, onDelta, onLocation, onRemove }) {
    const currentLoc = locations.some((l) => l.id === el.locationId) ? el.locationId : "";
    return (
        <div style={cardS}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <strong style={{ color: C.text }}>{el.name}</strong>
                {onRemove && <button onClick={onRemove} style={{ border: "none", background: "transparent", color: C.muted, cursor: "pointer", fontSize: 14 }}>✕</button>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {type.counters.map((c) => (
                    <Counter key={c.key} label={c.label} color={c.color}
                             value={el.counters?.[c.key] ?? 0} onDelta={(d) => onDelta(c.key, d)} />
                ))}
            </div>
            {type.hasLocation && (
                <div style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 12, color: C.muted, marginRight: 6 }}>Location</label>
                    <select value={currentLoc} onChange={(e) => onLocation(e.target.value)} style={selectS}>
                        <option value="">—</option>
                        {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>
            )}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={{ marginBottom: 22 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", color: C.accent }}>{title}</h3>
            {children}
        </div>
    );
}

// ── Hoisted to module scope so the input keeps focus on mobile ──
function AddRow({ type, value, onChange, onAdd }) {
    return (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input value={value} placeholder={`Add ${TYPES[type].label.toLowerCase()}…`}
                   onChange={(e) => onChange(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && onAdd()} style={inputS} />
            <button onClick={onAdd} style={addBtn}>Add</button>
        </div>
    );
}

// ── Random generator ──
// Single pattern: "N: bag" → draw N items from the bag, without replacement.
// The bag is either:
//   x..y   → the integers x, x+1, … y     (e.g. "1: 1..6" is a die roll)
//   abc…   → individual chars/emoji       (whitespace ignored, ❤️ stays intact)
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function bagItems(bag) {
    const range = bag.match(/^(-?\d+)\s*\.\.\s*(-?\d+)$/);
    if (range) {
        let [a, b] = [parseInt(range[1], 10), parseInt(range[2], 10)];
        if (a > b) [a, b] = [b, a];
        return Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
    }
    // Split into graphemes so multi-codepoint emoji (e.g. ❤️) stay intact; ignore whitespace.
    return [...new Intl.Segmenter().segment(bag)]
        .map((s) => s.segment)
        .filter((s) => s.trim() !== "");
}

function rollInput(raw) {
    const m = raw.trim().match(/^(\d+)\s*:\s*(.+)$/);
    if (!m) return "?";
    const n = parseInt(m[1], 10);
    const items = bagItems(m[2]);
    if (n < 1 || items.length === 0) return "?";
    // Draw without replacement: each pick is removed from the bag.
    const picks = [];
    for (let i = 0; i < n && items.length > 0; i++) {
        picks.push(items.splice(randInt(0, items.length - 1), 1)[0]);
    }
    return picks.join(" ");
}

function RandomGen({ placeholder, value, onChange, onRemove }) {
    const [result, setResult] = useState("");

    function roll() {
        setResult(rollInput(value));
    }

    return (
        <div style={cardS}>
            <div style={{ display: "flex", gap: 8 }}>
                <input value={value} placeholder={placeholder}
                       onChange={(e) => onChange(e.target.value)}
                       onKeyDown={(e) => e.key === "Enter" && roll()} style={inputS} />
                <button onClick={onRemove} title="Delete"
                        style={{ ...stepBtn, width: 36, color: C.muted, fontSize: 14 }}>✕</button>
                <button onClick={roll} style={addBtn}>Roll</button>
            </div>
            {result !== "" && (
                <div style={{ marginTop: 10, fontSize: 26, textAlign: "center", color: C.text, letterSpacing: 2 }}>
                    {result}
                </div>
            )}
        </div>
    );
}

function App() {
    const [els, setEls] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [drafts, setDrafts] = useState({ location: "", enemy: "", player: "" });

    async function load() {
        let all = await db.list({ orderBy: ["createdAt", "asc"] });
        if (!all.some((e) => e.type === "scenario")) {
            await db.create({ type: "scenario", name: "Scenario", counters: { act: 1, agenda: 1, doom: 0 }, createdAt: Date.now() });
            all = await db.list({ orderBy: ["createdAt", "asc"] });
        }
        setEls(all);
        setLoaded(true);
    }
    useEffect(() => { load(); }, []);

    // Generic counter change — clamped at 0, optimistic + persisted
    function delta(id, key, d) {
        setEls((prev) => prev.map((e) => {
            if (e.id !== id) return e;
            const counters = { ...e.counters, [key]: Math.max(0, (e.counters?.[key] ?? 0) + d) };
            db.update(id, { counters });
            return { ...e, counters };
        }));
    }

    function setRandomValue(id, value) {
        setEls((prev) => prev.map((e) => (e.id === id ? { ...e, value } : e)));
        db.update(id, { value });
    }

    async function addRandom() {
        const slot = els.reduce((m, e) => (e.type === "random" ? Math.max(m, e.slot) : m), -1) + 1;
        await db.create({ type: "random", slot, value: "", placeholder: "e.g. 1: 0..99 or 3: 💀💀⭐️🦑", createdAt: Date.now() });
        load();
    }

    function setLocation(id, locationId) {
        setEls((prev) => prev.map((e) => (e.id === id ? { ...e, locationId } : e)));
        db.update(id, { locationId });
    }

    async function add(type) {
        const count = els.filter((e) => e.type === type).length;
        const name = drafts[type].trim() || `${TYPES[type].label} ${count + 1}`;
        const counters = {};
        TYPES[type].counters.forEach((c) => { counters[c.key] = 0; });
        await db.create({ type, name, counters, locationId: "", createdAt: Date.now() });
        setDrafts((d) => ({ ...d, [type]: "" }));
        load();
    }

    function remove(id) {
        setEls((prev) => prev.filter((e) => e.id !== id));
        db.remove(id);
    }

    if (!loaded) return <div style={{ fontFamily: "system-ui", color: C.muted, padding: 16 }}>Loading…</div>;

    const scenario = els.find((e) => e.type === "scenario");
    const locations = els.filter((e) => e.type === "location");
    const enemies = els.filter((e) => e.type === "enemy");
    const players = els.filter((e) => e.type === "player");
    const randoms = els.filter((e) => e.type === "random").sort((a, b) => a.slot - b.slot);
    const doomInPlay = (scenario?.counters?.doom ?? 0) + enemies.reduce((s, e) => s + (e.counters?.doom ?? 0), 0);

    const cardsFor = (list) => list.map((el) => (
        <ElementCard key={el.id} el={el} type={TYPES[el.type]} locations={locations}
                     onDelta={(k, d) => delta(el.id, k, d)}
                     onLocation={(locId) => setLocation(el.id, locId)}
                     onRemove={() => remove(el.id)} />
    ));

    return (
        <div style={{ fontFamily: "system-ui", color: C.text, minHeight: "100%" }}>

            <Section title="Scenario">
                {scenario && (
                    <ElementCard el={scenario} type={TYPES.scenario} locations={locations}
                                 onDelta={(k, d) => delta(scenario.id, k, d)} onLocation={() => {}} onRemove={null} />
                )}
                <div style={{ fontSize: 13, color: C.muted, paddingLeft: 2 }}>
                    Total doom in play: <strong style={{ color: COLORS.doom }}>{doomInPlay}</strong>
                </div>
            </Section>

            <Section title="Random">
                {randoms.map((r) => (
                    <RandomGen key={r.id} value={r.value ?? ""} placeholder={r.placeholder}
                               onChange={(v) => setRandomValue(r.id, v)}
                               onRemove={() => remove(r.id)} />
                ))}
                <button onClick={addRandom} style={addBtn}>Add generator</button>
            </Section>

            <Section title="Investigators">
                <AddRow type="player" value={drafts.player}
                        onChange={(v) => setDrafts((d) => ({ ...d, player: v }))}
                        onAdd={() => add("player")} />
                {cardsFor(players)}
            </Section>

            <Section title="Enemies">
                <AddRow type="enemy" value={drafts.enemy}
                        onChange={(v) => setDrafts((d) => ({ ...d, enemy: v }))}
                        onAdd={() => add("enemy")} />
                {cardsFor(enemies)}
            </Section>

            <Section title="Locations">
                <AddRow type="location" value={drafts.location}
                        onChange={(v) => setDrafts((d) => ({ ...d, location: v }))}
                        onAdd={() => add("location")} />
                {cardsFor(locations)}
            </Section>
        </div>
    );
}

render(<App />);
