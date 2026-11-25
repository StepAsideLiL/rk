import { app, ipcMain } from "electron";
import { IpcChannels } from "@shared/ipc-channels";

export const registerAppIpc = (): void => {
  ipcMain.handle(IpcChannels.getAppVersion, () => app.getVersion());
};
