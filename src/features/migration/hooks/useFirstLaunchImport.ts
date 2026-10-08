import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { hasImportedBefore, offerElectronImport } from "@/shared/lib/migration/electron-import";

export const IMPORT_DISMISSED_KEY = "lazify-chain-import-dismissed";
export const IMPORT_PATH = "/import";

export function useFirstLaunchImport() {
	const navigate = useNavigate();
	const { pathname } = useLocation();

	useEffect(() => {
		if (pathname === IMPORT_PATH || localStorage.getItem(IMPORT_DISMISSED_KEY)) return;

		let cancelled = false;
		void (async () => {
			if (await hasImportedBefore()) return;
			if (!(await offerElectronImport())) return;
			if (!cancelled) navigate(IMPORT_PATH);
		})().catch(() => undefined);

		return () => {
			cancelled = true;
		};
	}, []);
}
