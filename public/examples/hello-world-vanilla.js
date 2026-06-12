// @name Hello Vanilla
// @description The smallest vanilla example — writes a greeting into root.
// @type vanilla

// Globals: root (HTMLElement), db (scoped), ctx

const h1 = document.createElement("h1");
h1.style.fontFamily = "system-ui";
h1.textContent = "Hello, vanilla! 👋";
root.append(h1);
