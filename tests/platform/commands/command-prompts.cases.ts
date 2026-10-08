const ESC = String.fromCodePoint(27);

export const PROMPT_OUTPUTS: Array<[string, string]> = [
	["plain y/N", "Overwrite existing files? (y/N) "],
	["Y/n in brackets", "Proceed with installation? [Y/n]"],
	["confirmation after other output", "added 12 packages\nfound 0 vulnerabilities\nContinue? (y/n)"],
	["confirmation with no question text", "(y/N)"],
	["confirmation not on the last line", "Ok to proceed? (y/N)\nInstalling..."],
	["numbered options with a question", "Which framework?\n1. React\n2. Vue\n3) Svelte\n> 1"],
	["numbered options without a question", "1. Yes\n2. No"],
	["only one numbered option", "Pick one:\n1. Only"],
	["ANSI colours around a prompt", `${ESC}[36m?${ESC}[39m Overwrite? ${ESC}[2m(y/N)${ESC}[22m`],
	["carriage returns redraw the line", "Loading...\rWorking...\rReplace config? (y/N)"],
	["OSC title sequence", `${ESC}]0;npm${String.fromCodePoint(7)}Delete it? (Y/n)`],
	["no prompt", "Compiled successfully in 1.2s\n"],
	["empty output", ""],
	["more than thirty lines", `${Array.from({ length: 40 }, (_, i) => `line ${i}`).join("\n")}\nKeep going? (y/N)`],
];
