import { PAGE_LOCATOR_SOURCE } from "../drivers/web/locator-source";

export const RECORD_BINDING = "__lazifyRecord";

export const RECORDER_SOURCE = `(function () {
  if (window.__lazifyRecorderReady) return;
  window.__lazifyRecorderReady = true;

  var locate = ${PAGE_LOCATOR_SOURCE};
  var helpers = locate({ helpers: true });

  var SECRET_FIELD = /pass|secret|token|apikey|api_key|credential/i;
  var INTERACTIVE = "a[href], button, input, select, textarea, summary, [role], [onclick], [tabindex]";

  function send(payload) {
    try {
      window.${RECORD_BINDING}(JSON.stringify(payload));
    } catch (error) {
      return;
    }
  }

  function resolvesTo(selector, node) {
    try {
      return locate({ selector: selector, returnNode: true }) === node;
    } catch (error) {
      return false;
    }
  }

  function candidatesFor(node) {
    var found = [];
    var testId =
      node.getAttribute("data-testid") ||
      node.getAttribute("data-test-id") ||
      node.getAttribute("data-test");

    if (node.id) found.push({ id: node.id });
    if (testId) found.push({ id: testId });
    if (node.getAttribute("name")) found.push({ id: node.getAttribute("name") });

    var ariaLabel = node.getAttribute("aria-label");
    if (ariaLabel) found.push({ label: ariaLabel });

    var labelText = helpers.labelTextFor(node);
    if (labelText) found.push({ label: labelText });

    var role = helpers.roleOf(node);
    var name = helpers.accessibleName(node);
    if (role && name) found.push({ role: role, name: name });

    var text = helpers.textOf(node);
    if (text && text.length <= 60) found.push({ text: text });

    return found;
  }

  function selectorFor(node) {
    var options = candidatesFor(node);

    for (var index = 0; index < options.length; index += 1) {
      if (resolvesTo(options[index], node)) return options[index];
    }

    return null;
  }

  function actionable(node) {
    if (!node || node === document.documentElement) return null;
    if (typeof node.closest !== "function") return null;

    return node.closest(INTERACTIVE) || node;
  }

  function secretName(node) {
    var base = node.getAttribute("name") || node.id || "value";

    return base
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+/, "")
      .replace(/_+$/, "")
      .toUpperCase();
  }

  function isSecret(node) {
    if ((node.getAttribute("type") || "").toLowerCase() === "password") return true;

    return SECRET_FIELD.test((node.getAttribute("name") || "") + " " + (node.id || ""));
  }

  document.addEventListener(
    "click",
    function (event) {
      // A drag that just landed produces its own dragDrop step; the click the
      // browser fires right after on whatever is now under the pointer is not
      // a second, separate interaction.
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }

      var node = actionable(event.target);
      if (!node) return;

      var selector = selectorFor(node);
      if (!selector) return;

      send({ kind: event.altKey ? "expectVisible" : "tap", selector: selector });
    },
    true
  );

  document.addEventListener(
    "change",
    function (event) {
      var node = event.target;
      if (!node || !node.tagName) return;

      var tag = node.tagName.toLowerCase();
      if (tag !== "input" && tag !== "textarea" && tag !== "select") return;

      var type = (node.getAttribute("type") || "").toLowerCase();
      if (type === "checkbox" || type === "radio" || type === "submit" || type === "button") return;

      var selector = selectorFor(node);
      if (!selector) return;

      if (type === "file") {
        // The path itself only exists on the main-world preload's side — see
        // diagnostics-recorder.ts — this just names the interaction and which
        // input it happened on; the two get paired up in RecorderSession.
        var file = node.files && node.files[0];
        if (file) send({ kind: "uploadFile", selector: selector, fileName: file.name });
        return;
      }

      if (isSecret(node)) {
        send({ kind: "input", selector: selector, valueFrom: secretName(node) });
        return;
      }

      send({ kind: "input", selector: selector, value: String(node.value == null ? "" : node.value) });
    },
    true
  );

  // Two independent signals for "the user dragged something": native HTML5
  // drag-and-drop (draggable="true" elements) fires dragstart/drop and is
  // unambiguous; everything else (sortable lists, kanban boards, sliders) is
  // built on plain pointer events, so a press-move-release gesture that moves
  // far enough and isn't a text selection counts too.
  var dragSource = null;

  document.addEventListener(
    "dragstart",
    function (event) {
      dragSource = actionable(event.target);
      // The native path is taking this gesture; the pointer-based fallback
      // below must not also fire a second dragDrop for it.
      pointerDown = null;
    },
    true
  );

  document.addEventListener(
    "drop",
    function (event) {
      var targetNode = actionable(event.target);
      if (!dragSource || !targetNode || targetNode === dragSource) {
        dragSource = null;
        return;
      }

      var from = selectorFor(dragSource);
      var to = selectorFor(targetNode);
      dragSource = null;

      if (from && to) send({ kind: "dragDrop", selector: from, targetSelector: to });
    },
    true
  );

  var DRAG_THRESHOLD_PX = 10;
  var pointerDown = null;
  var suppressNextClick = false;

  function isTextEditable(node) {
    if (!node) return false;
    var tag = node.tagName ? node.tagName.toLowerCase() : "";

    return tag === "input" || tag === "textarea" || node.isContentEditable === true;
  }

  document.addEventListener(
    "pointerdown",
    function (event) {
      if (event.button !== 0) return;

      var node = actionable(event.target);
      if (!node || isTextEditable(event.target)) {
        pointerDown = null;
        return;
      }

      pointerDown = { node: node, x: event.clientX, y: event.clientY };
    },
    true
  );

  document.addEventListener(
    "pointerup",
    function (event) {
      var start = pointerDown;
      pointerDown = null;
      if (!start) return;

      var dx = event.clientX - start.x;
      var dy = event.clientY - start.y;
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD_PX) return;

      var selection = window.getSelection ? window.getSelection() : null;
      if (selection && !selection.isCollapsed) return;

      var endNode = actionable(event.target);
      if (!endNode || endNode === start.node) return;

      var from = selectorFor(start.node);
      var to = selectorFor(endNode);
      if (!from || !to) return;

      suppressNextClick = true;
      send({ kind: "dragDrop", selector: from, targetSelector: to });
    },
    true
  );
})();`;
