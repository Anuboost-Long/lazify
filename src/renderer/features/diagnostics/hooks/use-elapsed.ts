import { useEffect, useState } from "react";

export function useElapsed(since: number, ticking: boolean): number {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		setNow(Date.now());
		if (!ticking) return;

		const timer = setInterval(() => setNow(Date.now()), 1000);

		return () => clearInterval(timer);
	}, [since, ticking]);

	return Math.max(0, now - since);
}
