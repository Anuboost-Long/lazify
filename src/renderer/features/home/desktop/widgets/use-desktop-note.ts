import { atom, useAtom } from "jotai";

const STORAGE_KEY = "lazify-desktop-note";

function readStored() {
	try {
		return globalThis.localStorage.getItem(STORAGE_KEY) ?? "";
	} catch {
		return "";
	}
}

const noteAtom = atom(readStored());

export function useDesktopNote() {
	const [note, setNoteAtom] = useAtom(noteAtom);

	const setNote = (next: string) => {
		setNoteAtom(next);
		try {
			globalThis.localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// The note stays for this session.
		}
	};

	return { note, setNote };
}
