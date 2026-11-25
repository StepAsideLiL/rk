import { contextBridge, ipcRenderer } from "electron";
import { IpcChannels, type DesktopApi } from "@shared/ipc-channels";

const api: DesktopApi = {
  getAppVersion: () => ipcRenderer.invoke(IpcChannels.getAppVersion),
};

contextBridge.exposeInMainWorld("api", api);
