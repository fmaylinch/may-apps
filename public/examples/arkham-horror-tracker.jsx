// Globals: React, useState, useEffect, db, ctx, render

// ── The unified model: every element is just "a thing with counters" ──
const TYPES = {
    scenario: {
        label: "Scenario",
        counters: [
            { key: "act",    label: "Act",    color: "#caa24a" },
            { key: "agenda", label: "Agenda", color: "#b072f0" },
            { key: "doom",   label: "Doom",   color: "#e5484d" },
        ],
        hasLocation: false,
    },
    location: {
        label: "Location",
        counters: [{ key: "clues", label: "Clues", color: "#4aa3ff" }],
        hasLocation: false,
    },
    enemy: {
        label: "Enemy",
        counters: [
            { key: "health", label: "Health", color: "#5ac46a" },
            { key: "doom",   label: "Doom",   color: "#e5484d" },
        ],
        hasLocation: true,
    },
    player: {
        label: "Investigator",
        counters: [
            { key: "actions",   label: "Actions",   color: "#caa24a" },
            { key: "health",    label: "Health",    color: "#5ac46a" },
            { key: "horror",    label: "Horror",    color: "#b072f0" },
            { key: "clues",     label: "Clues",     color: "#4aa3ff" },
            { key: "resources", label: "Resources", color: "#f2c94c" },
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
                    Total doom in play: <strong style={{ color: "#e5484d" }}>{doomInPlay}</strong>
                </div>
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
