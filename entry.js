import React from "react";
import { createRoot } from "react-dom/client";
import { Loader } from "./lib/Views/Loader";

let mountedRoot;

async function loadMainScript() {
  return import("terriajs/lib/Core/prerequisites")
    .then(() => import("./index"))
    .then(({ default: terriaPromise }) => terriaPromise);
}

function resolveContainer(target) {
  if (!target || target === "ui") {
    return document.getElementById("ui");
  }

  if (typeof target === "string") {
    return document.getElementById(target);
  }

  return target;
}

/**
 * Mount TerriaJS into an arbitrary container element.
 * Used by the Lungsod command app to embed the Digital Twin as a micro-frontend.
 *
 * @param {HTMLElement|string} target - DOM element or element ID to mount into (default: "ui")
 * @returns {Promise<{ terria, viewState, unmount }>}
 */
export async function mountTerria(target = "ui") {
  const container = resolveContainer(target);
  if (!container) {
    throw new Error("Container element for Terria mount was not found.");
  }

  // Tear down previous mount if re-mounting
  if (mountedRoot) {
    mountedRoot.unmount();
    mountedRoot = undefined;
  }

  mountedRoot = createRoot(container);
  mountedRoot.render(<Loader />);

  // Load TerriaJS core + our index (creates Terria instance)
  const { terria, viewState } = await loadMainScript();

  // Import and render the full UI
  const { renderUi } = await import("./lib/Views/render");
  renderUi(mountedRoot);

  return {
    terria,
    viewState,
    unmount: unmountTerria,
  };
}

export function unmountTerria() {
  if (mountedRoot) {
    mountedRoot.unmount();
    mountedRoot = undefined;
  }
}

// Standalone mode: auto-mount if the #ui container exists (i.e. loaded at /twin/)
if (typeof window !== "undefined") {
  const autoContainer = document.getElementById("ui");
  if (autoContainer) {
    mountTerria(autoContainer).catch((err) => {
      console.error("Error loading main script:", err);
    });
  }
}
