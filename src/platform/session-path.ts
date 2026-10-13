let sessionPath: string | null = null;

/** What `nvm use` switched to: every later spawn gets this PATH unless it sets its own. */
export function setSessionPath(path: string): void {
	sessionPath = path;
}

export function withSessionPath(env: Record<string, string> = {}): Record<string, string> {
	return sessionPath && !("PATH" in env) ? { ...env, PATH: sessionPath } : env;
}
