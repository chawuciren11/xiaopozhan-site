(function () {
  "use strict";

  document.addEventListener("click", function (event) {
    document.querySelectorAll("[data-contribute-menu][open]").forEach(function (menu) {
      if (!menu.contains(event.target)) menu.removeAttribute("open");
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    document.querySelectorAll("[data-contribute-menu][open]").forEach(function (menu) {
      menu.removeAttribute("open");
      menu.querySelector("summary")?.focus();
    });
  });
})();
