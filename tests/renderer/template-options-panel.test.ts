import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { TemplateOptionsPanel } from "../../src/renderer/features/init/components/TemplateOptionsPanel";

const options = [
  {
    key: "typescript",
    label: "TypeScript",
    default: true,
    onFlag: "--ts",
    offFlag: "--js"
  },
  {
    key: "tailwind",
    label: "Tailwind CSS",
    default: false,
    onFlag: "--tailwind",
    offFlag: "--no-tailwind"
  }
];

describe("TemplateOptionsPanel", () => {
  it("renders nothing when the selected template has no options", () => {
    const markup = renderToStaticMarkup(
      createElement(TemplateOptionsPanel, {
        options: [],
        values: {},
        busy: false,
        onChange: vi.fn()
      })
    );

    expect(markup).toBe("");
  });

  it("renders option labels and their declared defaults", () => {
    const markup = renderToStaticMarkup(
      createElement(TemplateOptionsPanel, {
        options,
        values: {},
        busy: false,
        onChange: vi.fn()
      })
    );

    expect(markup).toContain("TypeScript");
    expect(markup).toContain("Tailwind CSS");
    expect(markup.match(/checked=""/g)).toHaveLength(1);
  });

  it("lets saved values override defaults and disables options while busy", () => {
    const markup = renderToStaticMarkup(
      createElement(TemplateOptionsPanel, {
        options,
        values: { typescript: false, tailwind: true },
        busy: true,
        onChange: vi.fn()
      })
    );

    expect(markup.match(/checked=""/g)).toHaveLength(1);
    expect(markup.match(/disabled=""/g)).toHaveLength(2);
  });
});
