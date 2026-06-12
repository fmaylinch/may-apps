// Globals: root (HTMLElement), db (scoped), ctx

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
