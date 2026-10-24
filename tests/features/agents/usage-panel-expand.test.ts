// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentUsagePanel } from "@/features/agents/components/usage";
import type { AgentUsageReport, AgentUsageSummary } from "@/shared/types/lazify";

vi.mock("react-i18next", async (importOriginal) => ({
	...(await importOriginal<typeof import("react-i18next")>()),
	useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: "en", language: "en" } }),
}));

afterEach(() => cleanup());

const totals = (total: number) => ({ input: total, output: 0, cacheRead: 0, cacheWrite: 0, total, messages: 0 });

function agent(agentId: string, label: string): AgentUsageSummary {
	return {
		agentId,
		label,
		hasData: true,
		session: totals(1200),
		today: totals(3400),
		week: totals(52000),
		allTime: totals(910000),
		history: Array.from({ length: 30 }, (_, day) => ({
			date: `2026-10-${String(day + 1).padStart(2, "0")}`,
			total: (day + 1) * 1000,
		})),
		lastActivity: null,
		rateLimit: null,
		weeklyBudget: null,
		blockBudget: null,
		sessionWindow: null,
	};
}

const report: AgentUsageReport = {
	generatedAt: "2026-10-30T00:00:00.000Z",
	since: null,
	agents: [agent("claude", "Claude Code"), agent("codex", "Codex")],
};

function renderPanel() {
	render(
		createElement(AgentUsagePanel, {
			report,
			loading: false,
			onRefresh: vi.fn(),
			onSetBudget: vi.fn(),
			onClose: vi.fn(),
		}),
	);
}

describe("usage panel", () => {
	it("opens an agent's full history from its bar chart, and goes back", async () => {
		renderPanel();

		const charts = screen.getAllByRole("button", { name: "agents.usage" });
		expect(charts).toHaveLength(2);

		await userEvent.click(charts[1]);

		expect(screen.getAllByText("Codex").length).toBeGreaterThan(0);
		expect(screen.queryByText("Claude Code")).toBeNull();
		expect(screen.queryAllByRole("button", { name: "agents.usage" })).toHaveLength(0);

		await userEvent.click(screen.getByRole("button", { name: "global_term.back" }));

		expect(screen.getByText("Claude Code")).toBeTruthy();
		expect(screen.getAllByRole("button", { name: "agents.usage" })).toHaveLength(2);
	});
});
