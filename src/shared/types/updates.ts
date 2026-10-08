/**
 * Where the in-app updater has got to. "unsupported" is the development build,
 * which has no packaged app to replace.
 */
export type UpdateState =
	| { status: "idle" }
	// `reason` distinguishes a dev run, where there is nothing to update, from a
	// build the updater cannot replace — a Linux .deb or .rpm, which belongs to
	// the package manager that installed it.
	| { status: "unsupported"; reason?: "development" | "package-manager" }
	| { status: "checking" }
	| { status: "current"; version: string }
	| {
			status: "available";
			version: string;
			releaseDate: string | null;
			releaseNotes: string | null;
	  }
	| {
			status: "downloading";
			percent: number;
			bytesPerSecond: number;
			transferred: number;
			total: number;
	  }
	| { status: "downloaded"; version: string }
	| { status: "error"; message: string };

/** A file the editor renders instead of reading: an image or a PDF. */
