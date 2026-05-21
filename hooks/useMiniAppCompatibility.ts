"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export type MiniAppProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMiniPay?: boolean;
};

type MiniAppCompatibility = {
  provider?: MiniAppProvider;
  isMiniPay: boolean;
  isFarcasterMiniApp: boolean;
  shouldAutoConnect: boolean;
  statusLabel?: string;
};

declare global {
  interface Window {
    ethereum?: MiniAppProvider;
  }
}

export function useMiniAppCompatibility(): MiniAppCompatibility {
  const [compatibility, setCompatibility] = useState<MiniAppCompatibility>({
    isMiniPay: false,
    isFarcasterMiniApp: false,
    shouldAutoConnect: false
  });

  useEffect(() => {
    let cancelled = false;

    async function detectMiniApp() {
      const injectedProvider = window.ethereum;
      const isMiniPay = Boolean(injectedProvider?.isMiniPay);

      let nextCompatibility: MiniAppCompatibility = {
        provider: injectedProvider,
        isMiniPay,
        isFarcasterMiniApp: false,
        shouldAutoConnect: isMiniPay,
        statusLabel: isMiniPay ? "MiniPay detected" : undefined
      };

      try {
        const isFarcasterMiniApp = await sdk.isInMiniApp();

        if (isFarcasterMiniApp) {
          const farcasterProvider = await sdk.wallet.getEthereumProvider();
          await sdk.actions.ready();

          nextCompatibility = {
            provider: (farcasterProvider as MiniAppProvider | undefined) || injectedProvider,
            isMiniPay,
            isFarcasterMiniApp,
            shouldAutoConnect: true,
            statusLabel: "Farcaster Mini App"
          };
        }
      } catch {
        // Regular browsers are expected to land here when no Mini App host is available.
      }

      if (!cancelled) {
        setCompatibility(nextCompatibility);
      }
    }

    detectMiniApp().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return compatibility;
}
