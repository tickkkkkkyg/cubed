// XyleHosting marketing pages — theme toggle, mobile nav, header state.

const STORAGE_KEY = "xyle-theme";

const root = document.documentElement;
const themeBtn = document.querySelector("[data-theme-toggle]");
const themeIcon = themeBtn?.querySelector("svg");
const navBtn = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const header = document.querySelector(".site-header");

const SUN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;
const MOON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
const BARS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`;
const CROSS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

// Light is the default, matching the reference site.
function currentTheme() {
  return root.dataset.theme === "dark" ? "dark" : "light";
}

function syncTheme() {
  if (!themeBtn) return;
  const dark = currentTheme() === "dark";
  themeBtn.setAttribute("aria-label", `Switch to ${dark ? "light" : "dark"} theme`);
  if (themeIcon) themeIcon.outerHTML = dark ? SUN : MOON;
}

syncTheme();

themeBtn?.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // preference will not persist, the toggle still works for this page
  }
  syncTheme();
});

function setNav(open) {
  if (!nav || !navBtn) return;
  nav.setAttribute("data-open", String(open));
  navBtn.setAttribute("aria-expanded", String(open));
  navBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  const icon = navBtn.querySelector("svg");
  if (icon) icon.outerHTML = open ? CROSS : BARS;
}

navBtn?.addEventListener("click", () => {
  setNav(nav?.getAttribute("data-open") !== "true");
});

// Any nav link closes the menu — otherwise it stays open over the new page.
nav?.addEventListener("click", (e) => {
  if (e.target.closest("a")) setNav(false);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav?.getAttribute("data-open") === "true") {
    setNav(false);
    navBtn.focus();
  }
});

// The header only grows a bottom rule once content has scrolled under it.
const onScroll = () => {
  header?.setAttribute("data-scrolled", String(window.scrollY > 8));
};
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });