export const PAGE_LOCATOR_SOURCE = String.raw`function (request) {
  function attr(name, value) {
    return "[" + name + '="' + String(value).replace(/(["\\])/g, "\\$1") + '"]';
  }

  function textOf(node) {
    return (node.innerText || node.textContent || "").replace(/\s+/g, " ").trim();
  }

  function accessibleName(node) {
    return (
      node.getAttribute("aria-label") ||
      node.getAttribute("title") ||
      node.getAttribute("placeholder") ||
      (node.value && typeof node.value === "string" ? node.value : "") ||
      textOf(node)
    );
  }

  function visible(node) {
    if (!node || !node.isConnected) return false;

    if (typeof node.checkVisibility === "function") {
      if (!node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    }

    var rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    var style = window.getComputedStyle(node);

    return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0;
  }

  var INTERACTIVE_TAGS = ["button", "a", "input", "select", "textarea", "summary"];
  var INTERACTIVE_ROLES = ["button", "link", "tab", "menuitem", "checkbox", "radio", "textbox"];

  function interactive(node) {
    if (INTERACTIVE_TAGS.indexOf(node.tagName.toLowerCase()) !== -1) return true;
    if (node.hasAttribute("onclick") || node.hasAttribute("tabindex")) return true;

    return INTERACTIVE_ROLES.indexOf(node.getAttribute("role") || "") !== -1;
  }

  function area(node) {
    var box = node.getBoundingClientRect();

    return box.width * box.height;
  }

  function firstMatch(nodes) {
    var ranked = nodes.slice().sort(function (left, right) {
      var byVisible = Number(visible(right)) - Number(visible(left));
      if (byVisible) return byVisible;

      var byInteractive = Number(interactive(right)) - Number(interactive(left));
      if (byInteractive) return byInteractive;

      return area(left) - area(right);
    });

    return ranked[0] || null;
  }

  function byId(value) {
    var candidates = [
      document.getElementById(value),
      document.querySelector(attr("data-testid", value)),
      document.querySelector(attr("data-test-id", value)),
      document.querySelector(attr("data-test", value)),
      document.querySelector(attr("name", value))
    ].filter(Boolean);

    return firstMatch(candidates);
  }

  function byLabel(value) {
    var labelled = Array.prototype.slice.call(document.querySelectorAll(attr("aria-label", value)));
    if (labelled.length) return firstMatch(labelled);

    var labels = Array.prototype.slice.call(document.querySelectorAll("label"));

    for (var index = 0; index < labels.length; index += 1) {
      if (textOf(labels[index]) !== value) continue;

      var control = labels[index].control || document.getElementById(labels[index].htmlFor);
      if (control) return control;
    }

    return null;
  }

  var IMPLICIT_ROLES = {
    button: "button, input[type=button], input[type=submit], input[type=reset], [role=button]",
    link: "a[href], [role=link]",
    textbox: "input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]), textarea, [role=textbox]",
    checkbox: "input[type=checkbox], [role=checkbox]",
    radio: "input[type=radio], [role=radio]",
    heading: "h1, h2, h3, h4, h5, h6, [role=heading]",
    tab: "[role=tab]",
    dialog: "dialog, [role=dialog]"
  };

  function byRole(role, name) {
    var query = IMPLICIT_ROLES[role] || attr("role", role);
    var nodes = Array.prototype.slice.call(document.querySelectorAll(query));
    var named = nodes.filter(function (node) {
      return accessibleName(node) === name;
    });

    if (!named.length) {
      named = nodes.filter(function (node) {
        return accessibleName(node).indexOf(name) !== -1;
      });
    }

    return firstMatch(named);
  }

  function byText(value) {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("body *"));
    var exact = [];
    var partial = [];

    for (var index = 0; index < nodes.length; index += 1) {
      var node = nodes[index];
      if (node.children.length > 2) continue;

      var text = textOf(node);
      if (text === value) exact.push(node);
      else if (text.indexOf(value) !== -1 && text.length < value.length + 40) partial.push(node);
    }

    return firstMatch(exact.length ? exact : partial);
  }

  function roleOf(node) {
    var explicit = node.getAttribute("role");
    if (explicit) return explicit;

    var tag = node.tagName.toLowerCase();
    if (tag === "a") return node.hasAttribute("href") ? "link" : "";
    if (tag === "button") return "button";
    if (tag === "textarea") return "textbox";
    if (/^h[1-6]$/.test(tag)) return "heading";

    if (tag === "input") {
      var type = (node.getAttribute("type") || "text").toLowerCase();
      if (type === "checkbox" || type === "radio") return type;
      if (type === "submit" || type === "button" || type === "reset") return "button";
      return "textbox";
    }

    return "";
  }

  function labelTextFor(node) {
    if (node.labels && node.labels.length) return textOf(node.labels[0]);

    var wrapper = node.closest ? node.closest("label") : null;

    return wrapper ? textOf(wrapper) : "";
  }

  if (request.helpers) {
    return {
      textOf: textOf,
      accessibleName: accessibleName,
      visible: visible,
      interactive: interactive,
      roleOf: roleOf,
      labelTextFor: labelTextFor
    };
  }

  var selector = request.selector;

  function locate() {
    if (selector.id) return byId(selector.id);
    if (selector.label) return byLabel(selector.label);
    if (selector.role) return byRole(selector.role, selector.name || "");
    if (selector.text) return byText(selector.text);

    return null;
  }

  if (selector.point) {
    return { found: true, visible: true, x: selector.point.x, y: selector.point.y, tag: "point" };
  }

  var target = locate();
  if (request.returnNode) return target;

  if (!target) return { found: false, visible: false, x: 0, y: 0, tag: "" };

  if (request.scrollIntoView) target.scrollIntoView({ block: "center", inline: "center" });
  if (request.focus && typeof target.focus === "function") target.focus();
  if (request.selectText && typeof target.select === "function") target.select();

  var box = target.getBoundingClientRect();

  return {
    found: true,
    visible: visible(target),
    x: box.left + box.width / 2,
    y: box.top + box.height / 2,
    tag: target.tagName.toLowerCase()
  };
}`;
