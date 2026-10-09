import { appDataPath, readTextFile, writeTextFile } from "@/platform/folders";

/**
 * Weekly token budgets the user sets by hand.
 *
 * Only Codex reports a real rate-limit window in its transcripts; for every
 * other agent a budget is the only way to show "how much of my allowance is
 * gone", so it is stored here and compared against the rolling 7-day total.
 */

export type AgentTokenBudgets = Record<string, number>;

async function storeFilePath(): Promise<string> {
  return `${await appDataPath()}/agent-token-budgets.json`;
}

export async function listAgentBudgets(): Promise<AgentTokenBudgets> {
  try {
    const parsed = JSON.parse((await readTextFile(await storeFilePath())) ?? "") as AgentTokenBudgets;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** A budget of 0 or less clears the entry. */
export async function setAgentBudget(agentId: string, weeklyTokens: number): Promise<AgentTokenBudgets> {
  const budgets = await listAgentBudgets();

  if (weeklyTokens > 0) {
    budgets[agentId] = Math.round(weeklyTokens);
  } else {
    delete budgets[agentId];
  }

  await writeTextFile(await storeFilePath(), JSON.stringify(budgets, null, 2));

  return budgets;
}
