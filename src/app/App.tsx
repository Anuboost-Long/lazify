import { useEffect, useState } from "react";

import { getFatalError, onFatalError } from "@/shared/lib/diagnostics/global-errors";

import { FatalErrorScreen } from "./components/FatalErrorScreen";
import { AppRouter } from "./router";

export default function App() {
	const [fatal, setFatal] = useState(() => getFatalError() !== null);

	useEffect(() => onFatalError(() => setFatal(true)), []);

	return fatal ? <FatalErrorScreen /> : <AppRouter />;
}
