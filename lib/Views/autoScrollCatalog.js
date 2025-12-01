export function enableCatalogAutoScroll() {
  waitForCatalog(() => {
    const scrollContainer = document.querySelector(
      ".tjs-data-catalog__data-catalog"
    );
    const stablePanel = document.querySelector("#panel--data-catalog");

    console.log("[AutoScroll] Scroll container =", scrollContainer);
    console.log("[AutoScroll] Stable panel =", stablePanel);

    if (!scrollContainer || !stablePanel) return;

    stablePanel.addEventListener("click", (event) => {
      const btn = event.target.closest(".tjs-data-catalog-group__btn--catalog");
      if (!btn) return;

      const root = btn.closest(".tjs-data-catalog-group__root");
      if (!root) return;

      scrollContainer.scrollTo({
        top: root.offsetTop,
        behavior: "smooth"
      });

      console.log("[AutoScroll] Scrolled to group:", root);
    });
  });
}

function waitForCatalog(callback) {
  const check = setInterval(() => {
    if (document.querySelector(".tjs-data-catalog__data-catalog")) {
      clearInterval(check);
      callback();
    }
  }, 300);
}
