/**
 * Decides whether a parsed prompt may be answered without the user.
 *
 * The whole feature lives or dies here, so the rule is stated once and applied
 * without exception: **this function says yes only to a prompt it recognises as
 * a routine permission request with an unambiguously narrow affirmative.**
 * Everything else — anything destructive, anything outward-facing, anything
 * asking the user what they would prefer, anything it simply cannot read — is
 * handed back for a human to answer.
 *
 * That asymmetry is deliberate. A held prompt costs the user the keypress they
 * were already going to make; a wrongly answered one costs them a force-push, a
 * dropped table, or a decision they never got asked about. So the guards are
 * written to fire on suspicion rather than on proof, and a new pattern that
 * turns out to be over-eager is a much cheaper mistake than a missing one.
 *
 * Pure, and separate from the controller for that reason: the interesting part
 * is which text maps to which verdict, and that should be checkable without a
 * terminal, a timer, or a running agent.
 */

import type { AgentPrompt, PromptOption } from "./prompt-parser";

/** Why a prompt was left for the user. Shown verbatim-ish in the activity feed. */
export type AutopilotHold =
	/** A command or target that must never be approved by a machine. */
	| "critical"
	/** The agent is asking what the user wants, not for permission to act. */
	| "opinion"
	/** A value has to be typed — a token, a name, a path. */
	| "free-text"
	/** No option means a plain, one-time "go ahead". */
	| "no-safe-option"
	/** The only affirmative would widen permissions beyond this one action. */
	| "widening"
	/** The same question keeps coming back: something is not sticking. */
	| "repeat"
	/** Too many answers too quickly — an agent asking this much needs a human. */
	| "rate-limit"
	/** The screen could not be read as a prompt at all. */
	| "unreadable";

export type AutopilotVerdict =
	| { action: "answer"; option: PromptOption; matched: string }
	| { action: "hold"; hold: AutopilotHold; matched: string | null };

interface Guard {
	/** Named so a hold can say which rule stopped it. */
	name: string;
	pattern: RegExp;
}

/**
 * Commands and targets that always go to the user, however routine the box
 * around them looks.
 *
 * Grouped by what makes them dangerous rather than by tool, because the tool is
 * not the point: what matters is whether the action can be undone, whether it
 * leaves the machine, and whether it touches something that is not the project.
 */
const CRITICAL_GUARDS: Guard[] = [
	// ── Irreversible on disk ────────────────────────────────────────────────
	{ name: "recursive-delete", pattern: /\brm\s+(?:-\w*\s+)*-\w*[rf]/i },
	{ name: "find-delete", pattern: /\bfind\b[^\n]*\s-(?:delete|exec\s+rm)\b/i },
	{ name: "disk-write", pattern: /\b(?:dd\s+if=|mkfs\b|shred\b|truncate\s+-s|>\s*\/dev\/)/i },
	{ name: "recursive-move-out", pattern: /\bmv\s+[^\n]*\s\/(?:etc|usr|var|bin|opt|System)\b/i },

	// ── Rewrites or publishes history ──────────────────────────────────────
	// Any push is outward-facing: it puts code somewhere other people read.
	{ name: "git-push", pattern: /\bgit\s+push\b/i },
	{ name: "git-hard-reset", pattern: /\bgit\s+reset\s+(?:-\w+\s+)*--hard\b/i },
	{ name: "git-clean", pattern: /\bgit\s+clean\b[^\n]*-\w*[fd]/i },
	{
		name: "git-history-rewrite",
		pattern: /\bgit\s+(?:rebase|filter-branch|filter-repo|reflog\s+delete)\b/i,
	},
	{
		name: "git-branch-delete",
		pattern: /\bgit\s+branch\s+(?:-\w+\s+)*-D\b|\bgit\s+push[^\n]*--delete\b/i,
	},
	{ name: "git-checkout-discard", pattern: /\bgit\s+(?:checkout|restore)\s+(?:--\s+)?\.(?:\s|$)/i },
	{ name: "skip-hooks", pattern: /--no-verify\b/i },
	{ name: "git-tag-force", pattern: /\bgit\s+tag\b[^\n]*-f\b/i },

	// ── Leaves the machine ─────────────────────────────────────────────────
	{ name: "publish", pattern: /\b(?:npm|yarn|pnpm|bun|cargo|poetry|gem|dotnet)\s+publish\b/i },
	// Split by kind of tool only to keep either pattern readable: a dedicated
	// hosting CLI, then the general-purpose cloud CLIs that can also ship.
	{
		name: "deploy",
		pattern:
			/\b(?:vercel|netlify|firebase|flyctl|fly|heroku|eas|expo|wrangler)\s+(?:\w+\s+)*(?:deploy|publish|submit|release|push)\b/i,
	},
	{
		name: "cloud-deploy",
		pattern:
			/\b(?:serverless|sls|gcloud|aws|az)\s+(?:\w+\s+)*(?:deploy|publish|submit|release|push)\b/i,
	},
	{ name: "prod-flag", pattern: /--prod(?:uction)?\b/i },
	{ name: "container-push", pattern: /\bdocker\s+push\b|\bpodman\s+push\b/i },
	{ name: "release", pattern: /\bgh\s+(?:release|pr\s+merge|workflow\s+run)\b/i },
	{
		name: "infra-apply",
		pattern: /\b(?:terraform|pulumi)\s+(?:apply|destroy)\b|\bkubectl\s+(?:apply|delete|drain)\b/i,
	},
	{
		name: "outbound-post",
		pattern: /\bcurl\b[^\n]*(?:-X\s*(?:POST|PUT|DELETE|PATCH)|--data|-d\s)/i,
	},

	// ── Runs code fetched from the network ─────────────────────────────────
	{ name: "pipe-to-shell", pattern: /(?:curl|wget)\b[^\n|]*\|\s*(?:sudo\s+)?(?:ba|z|k|fi)?sh\b/i },
	{ name: "pipe-to-interpreter", pattern: /\|\s*(?:python3?|node|ruby|perl)\b/i },

	// ── Privilege and system state ─────────────────────────────────────────
	// pkexec is the desktop-Linux route to the same thing, and asks through a
	// dialog rather than the terminal — so it is the easier one to wave through.
	{ name: "sudo", pattern: /(?:^|[\s;&|(])(?:sudo|doas|su|pkexec)\s/i },
	{ name: "permission-change", pattern: /\bchmod\s+(?:-R\s+)?(?:777|a\+w)|\bchown\b/i },
	{
		name: "global-install",
		pattern:
			/\b(?:npm|pnpm|yarn|bun)\s+(?:i|install|add)\b[^\n]*\s-g\b|\bnpm\s+install\s+--global\b/i,
	},
	{ name: "brew-install", pattern: /\bbrew\s+(?:install|uninstall|upgrade)\b/i },
	{ name: "kill-process", pattern: /\b(?:killall|pkill)\b|\bkill\s+-9\b/i },
	{ name: "system-path", pattern: /(?:^|\s)\/(?:etc|usr|bin|sbin|var|System|Library)\//i },
	{ name: "shutdown", pattern: /\b(?:shutdown|reboot|launchctl\s+(?:load|unload|bootout))\b/i },

	// ── Databases ──────────────────────────────────────────────────────────
	{
		name: "destructive-sql",
		pattern: /\b(?:drop\s+(?:table|database|schema)|truncate\s+table|delete\s+from)\b/i,
	},
	{
		name: "migration-reset",
		pattern:
			/\b(?:prisma|drizzle-kit|sequelize|knex|alembic|rails)\b[^\n]*\b(?:reset|drop|db:drop|migrate:reset|downgrade)\b/i,
	},
	{ name: "schema-force-push", pattern: /\bdb\s+push\b[^\n]*--(?:force|accept-data-loss)/i },

	// ── Secrets and anything outside the project ───────────────────────────
	// Reading a secret is as bad as writing one: it lands in the transcript.
	{
		name: "credential-file",
		pattern: /(?:^|[\s/'"])(?:\.env(?:\.\w+)?|\.npmrc|\.netrc|id_[re]d?sa|credentials)\b/i,
	},
	{
		name: "key-file",
		pattern: /(?:^|[\s/'"])(?:[\w-]+\.(?:pem|p12)|secrets?\.(?:ya?ml|json|ts|js))\b/i,
	},
	{ name: "credential-dir", pattern: /~?\/\.(?:ssh|aws|gnupg|kube|docker|config\/gh|gcloud)\b/i },
	{
		name: "keychain",
		pattern:
			/\b(?:security\s+(?:add|find|delete)-\w*password|keychain|op\s+read|vault\s+(?:read|write))\b/i,
	},
	{
		name: "secret-env",
		pattern: /\b(?:AWS_SECRET|API_KEY|ACCESS_TOKEN|PRIVATE_KEY|CLIENT_SECRET|PASSWORD)\s*=\s*\S/i,
	},
	{
		name: "home-wide",
		pattern: /(?:^|\s)(?:~|\$HOME)\/?(?:\s|$)|(?:^|\s)rm\b[^\n]*\s(?:~|\$HOME)\b/i,
	},

	// ── History the user cannot get back ───────────────────────────────────
	{ name: "session-clear", pattern: /\bgit\s+stash\s+(?:clear|drop)\b|\bhistory\s+-c\b/i },

	// ── The agent's own trust boundary ─────────────────────────────────────
	// These are not commands but decisions about what the agent is allowed to be
	// from here on. Answering one lowers the bar for everything after it, which
	// is precisely the bar autopilot is standing on — it must never move it.
	{ name: "trust-folder", pattern: /\bdo you trust\b|\btrust the (?:files|authors|contents)\b/i },
	{
		name: "bypass-permissions",
		pattern: /\bbypass permissions\b|\bdangerously[- ]skip\b|\byolo mode\b|\bskip all permission\b/i,
	},
	{ name: "mcp-trust", pattern: /\bmcp server\b|\bnew mcp\b/i },
	{
		name: "login",
		pattern: /\b(?:log ?in|sign ?in|authenticate|authorize)\b[^\n]{0,40}\?|\bapi key\b|\boauth\b/i,
	},
];

/**
 * Options that mark a prompt as a decision about the *work* rather than about
 * one action.
 *
 * Plan approval is the case that matters. Its question is as innocuous as any
 * permission box — "Would you like to proceed?" — and it has a perfectly narrow
 * "Yes, and manually approve edits" sitting in the list, so nothing else here
 * would stop it. What it actually asks is whether a plan the user has not read
 * is the plan to build, and that is theirs to say.
 */
const OPINION_OPTION_GUARDS: Guard[] = [
	{
		name: "plan-mode",
		pattern:
			/\bkeep planning\b|\bauto[- ]?accept edits\b|\bmanually approve edits\b|\brevise the plan\b/i,
	},
	{
		name: "pick-alternative",
		pattern: /\b(?:instead|either way|another approach|different approach)\b/i,
	},
];

/**
 * Wording that marks a question as asking for the user's judgement rather than
 * their permission.
 *
 * The structural test below catches most of these already — a question offering
 * two design directions has no affirmative to pick. This catches the ones that
 * *do* look answerable: "Should I also update the changelog? 1. Yes 2. No" has
 * a perfectly good "Yes" sitting there, and answering it decides the scope of
 * the work on the user's behalf. Scope is theirs to set.
 */
const OPINION_GUARDS: Guard[] = [
	{
		name: "preference",
		pattern: /\b(?:which|what) (?:would you|do you|one|option|approach|of these)\b/i,
	},
	{ name: "prefer", pattern: /\b(?:prefer|preference|your call|up to you|thoughts\?)\b/i },
	{ name: "should-i", pattern: /\b(?:should|shall) (?:i|we)\b/i },
	{
		name: "also-instead",
		pattern: /\b(?:want me to|would you like me to)\b[^\n]*\b(?:also|instead|too|as well)\b/i,
	},
	{
		name: "naming",
		pattern: /\bwhat (?:should|shall) (?:i|we|it) (?:call|name)\b|\bname (?:it|this|the)\b[^\n]*\?/i,
	},
	{ name: "plan-approval", pattern: /\b(?:plan|approach|design|strategy|proposal)\b[^\n]{0,40}\?/i },
	{
		name: "keep-going",
		pattern: /\b(?:continue|proceed) (?:with|to) (?:the )?(?:next|rest|remaining)\b/i,
	},
];

/** A plain, one-time "go ahead". */
const AFFIRMATIVE =
	/^(?:yes|y|allow|approve|proceed|continue|ok(?:ay)?|confirm|accept|apply|do it|go ahead)\b/i;

/**
 * An affirmative that grants more than the action on screen: the rest of the
 * session, every future command of this kind, every edit in the project.
 *
 * These are exactly the options a user reaches for when they are tired of
 * pressing yes, which is the reason autopilot must not: choosing one silently
 * lowers the permission bar for everything that comes after, and the user never
 * saw the box it was decided in. Autopilot answers this one action, every time,
 * and stays answerable for the next.
 */
const WIDENING =
	/\b(?:don'?t ask again|do not ask again|always|all (?:edits|commands|future)|rest of (?:this )?session|during this session|for (?:this|the) session|yes to all|auto[- ]?accept)\b/i;

/** First guard whose pattern is found, or null. */
function firstMatch(guards: Guard[], text: string): string | null {
	for (const guard of guards) {
		if (guard.pattern.test(text)) return guard.name;
	}

	return null;
}

/**
 * Reads a parsed prompt and returns what autopilot may do with it.
 *
 * Order matters: the dangerous tests run before the useful ones, so a prompt
 * that trips any of them is held on that ground rather than being answered
 * because something later looked fine.
 */
export function decideAutopilot(prompt: AgentPrompt): AutopilotVerdict {
	// A value to type is never autopilot's to invent.
	if (prompt.kind === "freetext") {
		return { action: "hold", hold: "free-text", matched: null };
	}

	// The command, the diff, the paths — and the question, because a one-line
	// prompt carries its subject inside the question itself.
	const subject = `${prompt.body}\n${prompt.question}`;
	const critical = firstMatch(CRITICAL_GUARDS, subject);

	if (critical) {
		return { action: "hold", hold: "critical", matched: critical };
	}

	// Option labels are part of the subject too: "3. Yes, and run the deploy" is
	// a deploy, whatever the body said.
	const labels = prompt.options.map((option) => option.label).join("\n");
	const inOptions = firstMatch(CRITICAL_GUARDS, labels);

	if (inOptions) {
		return { action: "hold", hold: "critical", matched: inOptions };
	}

	const opinion =
		firstMatch(OPINION_GUARDS, prompt.question) ?? firstMatch(OPINION_OPTION_GUARDS, labels);

	if (opinion) {
		return { action: "hold", hold: "opinion", matched: opinion };
	}

	const affirmatives = prompt.options.filter((option) => AFFIRMATIVE.test(option.label));

	// Nothing that reads as a plain go-ahead. Either the options are substantive
	// alternatives — which is the structural shape of a question about direction
	// — or the prompt is one this parser does not understand well enough.
	if (affirmatives.length === 0) {
		return { action: "hold", hold: "no-safe-option", matched: null };
	}

	const narrow = affirmatives.find((option) => !WIDENING.test(option.label));

	if (!narrow) {
		return { action: "hold", hold: "widening", matched: affirmatives[0].label };
	}

	return { action: "answer", option: narrow, matched: narrow.label };
}
