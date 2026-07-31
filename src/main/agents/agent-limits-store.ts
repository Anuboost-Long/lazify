import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

/**
 * Weekly token budgets the user sets by hand.
 *
 * Only Codex reports a real rate-limit window in its transcripts; for every
 * other agent a budget is the only way to show "how much of my allowance is
 * gone", so it is stored here and compared against the rolling 7-day total.
 */

export type AgentTokenBudgets = Record<string, number>;

function storeFilePath(): string {
  return path.join(app.getPath("userData"), "agent-token-budgets.json");
}

export function listAgentBudgets(): AgentTokenBudgets {
  try {
    const parsed = JSON.parse(fs.readFileSync(storeFilePath(), "utf8")) as AgentTokenBudgets;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** A budget of 0 or less clears the entry. */
export function setAgentBudget(agentId: string, weeklyTokens: number): AgentTokenBudgets {
  const budgets = listAgentBudgets();

  if (weeklyTokens > 0) {
    budgets[agentId] = Math.round(weeklyTokens);
  } else {
    delete budgets[agentId];
  }

  const filePath = storeFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(budgets, null, 2), "utf8");

  return budgets;
}
