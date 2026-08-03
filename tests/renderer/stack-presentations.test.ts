import { describe, expect, it } from "vitest";

import { getTemplatePresentation } from "../../src/renderer/features/init/lib/stack-presentations";

describe("getTemplatePresentation", () => {
  it("returns the stack-specific presentation for known templates", () => {
    expect(
      getTemplatePresentation({ id: "next-default", label: "Next.js", description: "" })
    ).toMatchObject({ badge: "Server-ready", iconName: "nextjs-original" });
    expect(
      getTemplatePresentation({ id: "expo-default", label: "Expo", description: "" })
    ).toMatchObject({ badge: "Mobile-first", iconName: "react-original" });
    expect(
      getTemplatePresentation({ id: "vite-react", label: "Vite", description: "" })
    ).toMatchObject({ badge: "Fast iteration", iconName: "vitejs-plain" });
  });

  it("gives newly catalogued stacks a complete fallback presentation", () => {
    const presentation = getTemplatePresentation({
      id: "future-stack",
      label: "Future Stack",
      description: ""
    });

    expect(presentation.badge).toBe("Custom runtime");
    expect(presentation.iconName).toBe("react-original");
    expect(presentation.bestFor).not.toBe("");
    expect(presentation.frameClassName).not.toBe("");
  });
});
