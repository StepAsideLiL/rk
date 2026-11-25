import { useEffect, useState } from "react";
import { getAppVersion } from "@renderer/lib/ipc";

interface AppVersionState {
  version: string | null;
  error: string | null;
  isLoading: boolean;
}

export const useAppVersion = (): AppVersionState => {
  const [version, setVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getAppVersion()
      .then((value) => {
        if (active) {
          setVersion(value);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { version, error, isLoading: version === null && error === null };
};
