export const IpcChannels = {
  getAppVersion: "app:get-version",
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

export interface IpcInvokeMap {
  [IpcChannels.getAppVersion]: {
    args: [];
    result: string;
  };
}

export type IpcArgs<C extends IpcChannel> = IpcInvokeMap[C]["args"];
export type IpcResult<C extends IpcChannel> = IpcInvokeMap[C]["result"];

export interface DesktopApi {
  getAppVersion: () => Promise<IpcResult<typeof IpcChannels.getAppVersion>>;
}
