// Server-safe (no React imports): used by the root layout.
export const THEME_KEY = "mk-theme";

/** Inline script (runs before paint) so there is no flash of the wrong theme. */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_KEY}")||"dark";var t=p==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):p;document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;
