export const PAGE_SCRIPT = `(function () {
  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest("a[href^='#']");
    if (!link) return;
    var target = document.getElementById(decodeURIComponent(link.getAttribute("href").slice(1)));
    if (!target) return;
    event.preventDefault();
    var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  });

  var CLIPBOARD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><rect x="9" y="2.5" width="6" height="4" rx="1.3"/></svg>';
  var TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17.5 19 7"/></svg>';

  function said(button, word) {
    button.innerHTML = word === "Copied" ? TICK : CLIPBOARD;
    button.title = word;
    setTimeout(function () {
      button.innerHTML = CLIPBOARD;
      button.title = "Copy";
    }, 1400);
  }

  function byHand(text, button) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      said(button, document.execCommand("copy") ? "Copied" : "Press Ctrl+C");
    } catch (error) {
      said(button, "Press Ctrl+C");
    }
    document.body.removeChild(area);
  }

  var waiting = null;

  window.addEventListener("message", function (event) {
    if (!waiting || !event.data || event.data.type !== "lazify-doc-copied") return;
    clearTimeout(waiting.timer);
    said(waiting.button, "Copied");
    waiting = null;
  });

  function askHost(text, button) {
    waiting = {
      button: button,
      timer: setTimeout(function () { waiting = null; byHand(text, button); }, 600)
    };
    window.parent.postMessage({ type: "lazify-doc-copy", text: text }, "*");
  }

  function copy(text, button) {
    if (window.parent !== window) {
      askHost(text, button);
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { said(button, "Copied"); },
        function () { byHand(text, button); }
      );
      return;
    }
    byHand(text, button);
  }

  function attach(host, source) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "copy";
    button.title = "Copy";
    button.setAttribute("aria-label", "Copy");
    button.innerHTML = CLIPBOARD;
    button.addEventListener("click", function () { copy(source.textContent, button); });
    host.appendChild(button);
  }

  Array.prototype.forEach.call(document.querySelectorAll("pre.doc-code"), function (block) {
    var wrap = document.createElement("div");
    wrap.className = "code-block";
    block.parentNode.insertBefore(wrap, block);
    wrap.appendChild(block);
    attach(wrap, block);
  });

  Array.prototype.forEach.call(document.querySelectorAll(".path-bar"), function (bar) {
    attach(bar, bar.querySelector(".path"));
  });
})();`;
