import { ipcRenderer } from "electron";

import { subscribe } from "./subscribe";
export const mediaApi = {
	openPictureInPicture: (
		url: string,
		source: import("../../main/media/picture-in-picture").PictureInPictureSource,
	): Promise<import("../../main/media/picture-in-picture").PictureInPictureState> =>
		ipcRenderer.invoke("lazify:open-picture-in-picture", url, source),
	closePictureInPicture: (): Promise<
		import("../../main/media/picture-in-picture").PictureInPictureState
	> => ipcRenderer.invoke("lazify:close-picture-in-picture"),
	getPictureInPictureState: (): Promise<
		import("../../main/media/picture-in-picture").PictureInPictureState
	> => ipcRenderer.invoke("lazify:picture-in-picture-state"),
	onPictureInPictureChanged: (
		callback: (state: import("../../main/media/picture-in-picture").PictureInPictureState) => void,
	) => subscribe("lazify:picture-in-picture-changed", callback),
	toggleMediaPictureInPicture: (
		webContentsId: number,
	): Promise<import("../../main/media/media-pip").MediaPipResult> =>
		ipcRenderer.invoke("lazify:toggle-media-picture-in-picture", webContentsId),
};
