// @name Counter (vanilla)
// @description Plain JS + DOM. Persists its count via the scoped db.
// @type vanilla
// @seed

// Globals: root (HTMLElement), db (scoped), ctx
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
