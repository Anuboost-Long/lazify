import { contextBridge } from "electron";

import { lazifyApi } from "./api";

contextBridge.exposeInMainWorld("lazify", lazifyApi);
