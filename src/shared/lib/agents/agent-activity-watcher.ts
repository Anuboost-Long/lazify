export interface AgentActivityEvent {
  /** The agent whose turn just ended — only its usage needs re-reading. */
  agentId: string;
}
