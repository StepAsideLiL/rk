import type { DesktopApi } from "@shared/ipc-channels";

declare global {
  interface Window {
    api: DesktopApi;
  }
}

export {};
