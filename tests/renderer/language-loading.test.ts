import { describe, expect, it } from "vitest";

import i18n, { changeLanguage, loadLanguage, normalizeLanguage } from "../../src/renderer/i18n/i18n";

describe("the languages the renderer boots with", () => {
  it("carries English up front, because it is the fallback", () => {
    expect(i18n.hasResourceBundle("en", "translation")).toBe(true);
  });

  it("fetches a language the first time it is asked for", async () => {
    expect(i18n.hasResourceBundle("kh", "translation")).toBe(false);

    await loadLanguage("kh");

    expect(i18n.hasResourceBundle("kh", "translation")).toBe(true);
    expect(i18n.getResource("kh", "translation", "global_term.save")).toBeTruthy();
  });

  it("switches only once the language is in hand", async () => {
    await changeLanguage("cn");

    expect(i18n.language).toBe("cn");
    expect(i18n.t("global_term.save")).toBe(i18n.getResource("cn", "translation", "global_term.save"));

    await changeLanguage("en");
  });

  it("reads the region spellings the picker offers", () => {
    expect(normalizeLanguage("km")).toBe("kh");
    expect(normalizeLanguage("zh-CN")).toBe("cn");
    expect(normalizeLanguage(null)).toBe("en");
  });
});
