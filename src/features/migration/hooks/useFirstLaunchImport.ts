import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { appRoute } from "@/app/app-routes";
import { hasImportedBefore, offerElectronImport } from "@/shared/lib/migration/electron-import";

export const IMPORT_DISMISSED_KEY = "lazify-chain-import-dismissed";

export function useFirstLaunchImport() {
	const navigate = useNavigate();
	const { pathname } = useLocation();

	useEffect(() => {
		if (pathname === appRoute.electronImport || localStorage.getItem(IMPORT_DISMISSED_KEY)) return;

		let cancelled = false;
		void (async () => {
			if (await hasImportedBefore()) return;
			if (!(await offerElectronImport())) return;
			if (!cancelled) navigate(appRoute.electronImport);
		})().catch(() => undefined);

		return () => {
			cancelled = true;
		};
	}, []);
}
