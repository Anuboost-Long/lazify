import { useNavigate } from "react-router-dom";

import { IMPORT_DISMISSED_KEY } from "@/features/migration/hooks/useFirstLaunchImport";
import { useElectronImport } from "@/features/migration/hooks/useElectronImport";
import ImportPage from "@/features/migration/pages/ImportPage";

export default function ImportRoute() {
	const navigate = useNavigate();
	const { state, granted, startImport, chooseProjectFolders } = useElectronImport();

	return (
		<ImportPage
			state={state}
			granted={granted}
			onImport={() => void startImport()}
			onNotNow={() => {
				localStorage.setItem(IMPORT_DISMISSED_KEY, "1");
				navigate("/");
			}}
			onChooseProjectFolders={() => void chooseProjectFolders()}
			onContinue={() => navigate("/")}
		/>
	);
}
