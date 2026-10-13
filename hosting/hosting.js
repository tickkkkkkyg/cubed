// XyleHosting marketing pages — theme toggle and mobile nav only.

const STORAGE_KEY = "xyle-theme";

const root = document.documentElement;
const toggle = document.querySelector("[data-theme-toggle]");
const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");

// Apply the stored preference before first paint would matter. The inline
// script in each page's <head> already does this; this is the fallback path.
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") root.dataset.theme = stored;
} catch {
  // storage unavailable (private mode) — the media query in CSS still applies
}

// The stylesheet's default is the brand's dark theme, regardless of OS
// preference, so "unset" must resolve to dark here too.
function currentTheme() {
  return root.dataset.theme === "light" ? "light" : "dark";
}

function syncToggleLabel() {
  if (!toggle) return;
  const isLight = currentTheme() === "light";
  toggle.textContent = isLight ? "Dark theme" : "Light theme";
  toggle.setAttribute("aria-label", `Switch to ${isLight ? "dark" : "light"} theme`);
}

syncToggleLabel();

toggle?.addEventListener("click", () => {
  const next = currentTheme() === "light" ? "dark" : "light";
  root.dataset.theme = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // preference simply will not persist
  }
  syncToggleLabel();
});

navToggle?.addEventListener("click", () => {
  const open = nav?.getAttribute("data-open") === "true";
  nav?.setAttribute("data-open", String(!open));
  navToggle.setAttribute("aria-expanded", String(!open));
  navToggle.textContent = open ? "Menu" : "Close";
});

// Escape closes the mobile menu; focus returns to the toggle.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav?.getAttribute("data-open") === "true") {
    nav.setAttribute("data-open", "false");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.textContent = "Menu";
    navToggle.focus();
  }
});