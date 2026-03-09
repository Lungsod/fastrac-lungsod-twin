import React from "react";
import { createRoot } from "react-dom/client";
import { Loader } from "./lib/Views/Loader";

let mountedRoot;

async function loadMainScript() {
  return import("terriajs/lib/Core/prerequisites")
    .then(() => import("./index"))
    .then(({ default: terriaPromise }) => terriaPromise);
}

async function bootstrap(root) {
  root.render(<Loader />);
  await loadMainScript();
  const { renderUi } = await import("./lib/Views/render");
  renderUi(root);
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

export async function mountTerria(target = "ui") {
  const container = resolveContainer(target);
  if (!container) {
    throw new Error("Container element for Terria mount was not found.");
  }

  if (mountedRoot) {
    mountedRoot.unmount();
    mountedRoot = undefined;
  }

  mountedRoot = createRoot(container);
  await bootstrap(mountedRoot);
}

export function unmountTerria() {
  if (mountedRoot) {
    mountedRoot.unmount();
    mountedRoot = undefined;
  }
}

if (typeof window !== "undefined") {
  const autoContainer = document.getElementById("ui");
  if (autoContainer) {
    mountTerria(autoContainer).catch((err) => {
      console.error("Error loading main script:", err);
    });
  }
}
