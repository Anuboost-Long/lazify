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

      if (isSecret(node)) {
        send({ kind: "input", selector: selector, valueFrom: secretName(node) });
        return;
      }

      send({ kind: "input", selector: selector, value: String(node.value == null ? "" : node.value) });
    },
    true
  );
})();`;
