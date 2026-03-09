/**
 * Fetches site config from the Django backend and applies brand colors
 * to CSS custom properties for runtime theming.
 */
export async function loadTheme() {
  try {
    const response = await fetch("/admin/site-config/", {
      credentials: "include"
    });
    if (!response.ok) return;
    const config = await response.json();

    if (config.primary) {
      const root = document.documentElement;
      root.style.setProperty("--lungsod-primary", config.primary);
      root.style.setProperty("--color-primary", config.primary);
    }
  } catch (e) {
    console.warn("[twin] Failed to load site config theme:", e.message);
  }
}
