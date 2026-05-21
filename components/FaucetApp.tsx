"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Droplets,
  ExternalLink,
  Info,
  Loader2,
  Mail,
  PlugZap,
  ShieldCheck,
  Utensils,
  Wallet,
  X
} from "lucide-react";
import {
  Address,
  createPublicClient,
  createWalletClient,
  custom,
  fallback,
  http,
  isAddress,
  parseUnits,
  zeroAddress
} from "viem";
import { appChain, appChainIdHex, appChainParams, baseRpcUrls, faucetAddress, tokenAddress } from "@/lib/chains";
import { erc20Abi, faucetVaultAbi } from "@/lib/abi";
import { compactAddress, formatCount, formatTokenAmount } from "@/lib/format";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

type Snapshot = {
  symbol: string;
  decimals: number;
  claimAmount?: bigint;
  vaultBalance?: bigint;
  walletBalance?: bigint;
  totalClaims?: bigint;
  hasClaimed?: boolean;
  canClaim?: boolean;
  paused?: boolean;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const configuredFaucetAddress =
  faucetAddress && isAddress(faucetAddress) ? (faucetAddress as Address) : undefined;
const faucetSiteUrl = "https://pappardellefaucet.vercel.app/";
const rektaurantUrl = "https://rektaurant.vercel.app/";
const zoraUrl = "https://zora.co/@pappardelle/creator-coin";

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    if ("shortMessage" in error && typeof error.shortMessage === "string") {
      return error.shortMessage;
    }

    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }

  return "The operation could not be completed.";
}

export function FaucetApp() {
  const [account, setAccount] = useState<Address>();
  const [networkOk, setNetworkOk] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>({
    symbol: "PAPPARDELLE",
    decimals: 18
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [txHash, setTxHash] = useState<`0x${string}`>();
  const [showInvitation, setShowInvitation] = useState(false);
  const [donationAmount, setDonationAmount] = useState("");
  const [isDonating, setIsDonating] = useState(false);

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: appChain,
        transport: fallback(baseRpcUrls.map((url) => http(url)))
      }),
    []
  );

  const refresh = useCallback(
    async (activeAccount = account) => {
      setIsRefreshing(true);
      setError(undefined);

      try {
        const [symbol, decimals] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "symbol"
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "decimals"
          })
        ]);

        if (!configuredFaucetAddress) {
          setSnapshot({
            symbol,
            decimals
          });
          return;
        }

        const [claimAmount, vaultBalance, totalClaims, paused, hasClaimed, canClaim, walletBalance] =
          await Promise.all([
            publicClient.readContract({
              address: configuredFaucetAddress,
              abi: faucetVaultAbi,
              functionName: "claimAmount"
            }),
            publicClient.readContract({
              address: configuredFaucetAddress,
              abi: faucetVaultAbi,
              functionName: "vaultBalance"
            }),
            publicClient.readContract({
              address: configuredFaucetAddress,
              abi: faucetVaultAbi,
              functionName: "totalClaims"
            }),
            publicClient.readContract({
              address: configuredFaucetAddress,
              abi: faucetVaultAbi,
              functionName: "paused"
            }),
            activeAccount
              ? publicClient.readContract({
                  address: configuredFaucetAddress,
                  abi: faucetVaultAbi,
                  functionName: "hasClaimed",
                  args: [activeAccount]
                })
              : Promise.resolve(false),
            activeAccount
              ? publicClient.readContract({
                  address: configuredFaucetAddress,
                  abi: faucetVaultAbi,
                  functionName: "canClaim",
                  args: [activeAccount]
                })
              : Promise.resolve(false),
            activeAccount
              ? publicClient.readContract({
                  address: tokenAddress,
                  abi: erc20Abi,
                  functionName: "balanceOf",
                  args: [activeAccount]
                })
              : Promise.resolve(0n)
          ]);

        setSnapshot({
          symbol,
          decimals,
          claimAmount,
          vaultBalance,
          walletBalance,
          totalClaims,
          hasClaimed,
          canClaim,
          paused
        });
      } catch (refreshError) {
        setError(getErrorMessage(refreshError));
      } finally {
        setIsRefreshing(false);
      }
    },
    [account, publicClient]
  );

  const checkNetwork = useCallback(async () => {
    const provider = window.ethereum;
    if (!provider) {
      setNetworkOk(false);
      return false;
    }

    const chainId = await provider.request({ method: "eth_chainId" });
    const isBase = typeof chainId === "string" && chainId.toLowerCase() === appChainIdHex;
    setNetworkOk(isBase);
    return isBase;
  }, []);

  const switchToBase = useCallback(async () => {
    const provider = window.ethereum;
    if (!provider) throw new Error("Wallet not found.");

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: appChainIdHex }]
      });
    } catch (switchError) {
      const maybeError = switchError as { code?: number };
      if (maybeError.code !== 4902) throw switchError;

      await provider.request({
        method: "wallet_addEthereumChain",
        params: [appChainParams]
      });
    }

    setNetworkOk(true);
  }, []);

  const requestAccount = useCallback(async () => {
    const provider = window.ethereum;
    if (!provider) throw new Error("Install a Base-compatible wallet.");

    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    const nextAccount = accounts.find((value) => isAddress(value));

    if (!nextAccount) throw new Error("No account is available in the wallet.");

    const typedAccount = nextAccount as Address;
    setAccount(typedAccount);
    return typedAccount;
  }, []);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(undefined);
    setStatus(undefined);

    try {
      const nextAccount = await requestAccount();
      const isBase = await checkNetwork();

      if (!isBase) {
        await switchToBase();
      }

      setStatus("Wallet connected on Base.");
      await refresh(nextAccount);
    } catch (connectError) {
      setError(getErrorMessage(connectError));
    } finally {
      setIsConnecting(false);
    }
  }, [checkNetwork, refresh, requestAccount, switchToBase]);

  const donateToFaucet = useCallback(async () => {
    setError(undefined);
    setStatus(undefined);
    setTxHash(undefined);

    if (!configuredFaucetAddress) {
      setError("The faucet address is not configured yet.");
      return;
    }

    const normalizedAmount = donationAmount.trim().replace(",", ".");

    if (!/^\d+(\.\d+)?$/.test(normalizedAmount)) {
      setError("Enter a valid PAPPARDELLE amount.");
      return;
    }

    try {
      const parsedDonationAmount = parseUnits(normalizedAmount, snapshot.decimals);

      if (parsedDonationAmount <= 0n) {
        throw new Error("Enter an amount greater than zero.");
      }

      if (snapshot.walletBalance !== undefined && parsedDonationAmount > snapshot.walletBalance) {
        throw new Error("Your wallet does not have enough PAPPARDELLE for this donation.");
      }

      const activeAccount = account || (await requestAccount());
      await switchToBase();

      const provider = window.ethereum;
      if (!provider) throw new Error("Wallet not found.");

      setIsDonating(true);
      setStatus("Confirm the PAPPARDELLE donation in your wallet.");

      const walletClient = createWalletClient({
        account: activeAccount,
        chain: appChain,
        transport: custom(provider)
      });

      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "transfer",
        args: [configuredFaucetAddress, parsedDonationAmount]
      });

      setTxHash(hash);
      setStatus("Donation sent. Waiting for Base confirmation.");

      await publicClient.waitForTransactionReceipt({ hash });
      setDonationAmount("");
      setStatus("Donation received. The faucet pantry has been refilled.");
      await refresh(activeAccount);
    } catch (donationError) {
      setError(getErrorMessage(donationError));
    } finally {
      setIsDonating(false);
    }
  }, [account, donationAmount, publicClient, refresh, requestAccount, snapshot.decimals, snapshot.walletBalance, switchToBase]);

  const claim = useCallback(async () => {
    setError(undefined);
    setStatus(undefined);
    setTxHash(undefined);

    try {
      if (!configuredFaucetAddress) {
        throw new Error("NEXT_PUBLIC_FAUCET_ADDRESS is not configured.");
      }

      const activeAccount = account || (await requestAccount());
      await switchToBase();

      const provider = window.ethereum;
      if (!provider) throw new Error("Wallet not found.");

      setIsClaiming(true);
      setStatus("Confirm the transaction in your wallet.");

      const walletClient = createWalletClient({
        account: activeAccount,
        chain: appChain,
        transport: custom(provider)
      });

      const hash = await walletClient.writeContract({
        address: configuredFaucetAddress,
        abi: faucetVaultAbi,
        functionName: "claim"
      });

      setTxHash(hash);
      setStatus("Transaction sent. Waiting for Base confirmation.");

      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("Serving claimed.");
      setShowInvitation(true);
      await refresh(activeAccount);
    } catch (claimError) {
      setError(getErrorMessage(claimError));
    } finally {
      setIsClaiming(false);
    }
  }, [account, publicClient, refresh, requestAccount, switchToBase]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    checkNetwork().catch(() => undefined);

    const provider = window.ethereum;
    if (!provider?.on || !provider.removeListener) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const nextAccount =
        Array.isArray(accounts) && typeof accounts[0] === "string" && isAddress(accounts[0])
          ? (accounts[0] as Address)
          : undefined;

      setAccount(nextAccount);
      refresh(nextAccount).catch(() => undefined);
    };

    const handleChainChanged = () => {
      checkNetwork().catch(() => undefined);
      refresh().catch(() => undefined);
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [checkNetwork, refresh]);

  useEffect(() => {
    if (!showInvitation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowInvitation(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showInvitation]);

  const explorerTokenUrl = `https://basescan.org/token/${tokenAddress}`;
  const explorerFaucetUrl = configuredFaucetAddress
    ? `https://basescan.org/address/${configuredFaucetAddress}`
    : undefined;
  const explorerTxUrl = txHash ? `https://basescan.org/tx/${txHash}` : undefined;

  const claimDisabled =
    isConnecting ||
    isClaiming ||
    isRefreshing ||
    !configuredFaucetAddress ||
    Boolean(snapshot.paused) ||
    Boolean(snapshot.hasClaimed) ||
    (account ? snapshot.canClaim === false : false);
  const donateDisabled = isConnecting || isDonating || isRefreshing || !configuredFaucetAddress || !donationAmount.trim();

  const claimLabel = !account
    ? "Connect wallet"
    : snapshot.hasClaimed
      ? "Already served"
      : snapshot.paused
        ? "Kitchen paused"
        : isClaiming
          ? "Preparing serving"
          : "Claim your serving";

  const displaySymbol = snapshot.symbol.toUpperCase();

  return (
    <div className="app-frame">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="site-logo" role="img" aria-label="PAPPARDELLE plate with crypto meatballs" />
          <div>
            <p className="eyebrow">Base mainnet</p>
            <h1>PAPPARDELLE Trattoria Faucet</h1>
          </div>
        </div>

        <div className={networkOk ? "network-pill ready" : "network-pill"}>
          <ShieldCheck size={16} />
          <span>{networkOk ? "Base ready" : "Base needed"}</span>
        </div>
      </header>

      <section
        className="promo-banner"
        aria-label="PAPPARDELLE trattoria banner with steaming crypto meatball pasta"
      >
        <div className="promo-banner-copy">
          <p className="eyebrow">Fresh from the chain</p>
          <h2>Crypto meatballs, one serving per wallet</h2>
          <p>Pull up a chair, claim your plate, and keep the faucet pantry warm.</p>
          <a className="menu-dish-link" href={faucetSiteUrl}>
            <span>Today's menu plate</span>
            <strong>{faucetSiteUrl}</strong>
          </a>
        </div>
      </section>

      <section className="claim-layout">
        <div className="claim-panel">
          <div className="claim-header">
            <div>
              <p className="eyebrow">One-time serving</p>
              <h2>{formatTokenAmount(snapshot.claimAmount, snapshot.decimals)} {displaySymbol}</h2>
              <p className="claim-copy">A fresh plate of PAPPARDELLE for each eligible wallet.</p>
            </div>
            <Utensils size={34} />
          </div>

          <div className="wallet-row">
            <div>
              <p className="label">Wallet</p>
              <p className="value">{account ? compactAddress(account) : "Not connected"}</p>
            </div>
            <button className="secondary-button" type="button" onClick={connectWallet} disabled={isConnecting}>
              {isConnecting ? <Loader2 className="spin" size={18} /> : <Wallet size={18} />}
              <span>{account ? "Reconnect" : "Connect"}</span>
            </button>
          </div>

          <button className="claim-button" type="button" onClick={claim} disabled={claimDisabled}>
            {isClaiming ? <Loader2 className="spin" size={20} /> : <PlugZap size={20} />}
            <span>{claimLabel}</span>
          </button>

          {!configuredFaucetAddress ? (
            <div className="notice warning">
              <AlertTriangle size={18} />
              <span>Configure NEXT_PUBLIC_FAUCET_ADDRESS after deploying the vault.</span>
            </div>
          ) : null}

          {snapshot.hasClaimed ? (
            <div className="notice success">
              <CheckCircle2 size={18} />
              <span>This wallet has already received its serving.</span>
            </div>
          ) : null}

          <div className="notice disclaimer">
            <Info size={18} />
            <span>
              Disclaimer: PAPPARDELLE is a utility token for accessing and using tools created by
              {" "}pappardelle.eth. It is not presented as an investment product.
            </span>
          </div>

          {status ? (
            <div className="notice success">
              <CheckCircle2 size={18} />
              <span>{status}</span>
            </div>
          ) : null}

          {error ? (
            <div className="notice error">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          ) : null}

          {explorerTxUrl ? (
            <a className="inline-link" href={explorerTxUrl} target="_blank" rel="noreferrer">
              View transaction on BaseScan
              <ExternalLink size={16} />
            </a>
          ) : null}
        </div>

        <div className="side-rail">
          <div
            className="dish-showcase"
            role="img"
            aria-label="A steaming plate of pappardelle with crypto meatballs, fork, spoon, knife, and a pappardelle.eth napkin."
          />

          <div className="action-grid" aria-label="PAPPARDELLE actions">
            <a className="action-card pay-check-card" href={zoraUrl} target="_blank" rel="noreferrer">
              <span className="action-card-image" aria-hidden="true" />
              <span className="action-card-copy">
                <span className="eyebrow">Pay check</span>
                <strong>Buy PAPPARDELLE on Zora</strong>
                <small>Open the creator coin page.</small>
              </span>
              <ExternalLink size={18} />
            </a>

            <form className="action-card tip-box-card donation-form" onSubmit={(event) => {
              event.preventDefault();
              donateToFaucet().catch(() => undefined);
            }}>
              <span className="action-card-image" aria-hidden="true" />
              <span className="action-card-copy">
                <span className="eyebrow">Tip box</span>
                <strong>Donate PAPPARDELLE to the Faucet</strong>
                <small>Choose how many tokens to send to the vault.</small>
              </span>
              <span className="donation-controls">
                <input
                  aria-label="Donation amount"
                  className="donation-input"
                  inputMode="decimal"
                  min="0"
                  onChange={(event) => setDonationAmount(event.target.value)}
                  placeholder="Amount"
                  type="text"
                  value={donationAmount}
                />
                <button className="donation-button" type="submit" disabled={donateDisabled}>
                  {isDonating ? <Loader2 className="spin" size={16} /> : <Coins size={16} />}
                  <span>Donate</span>
                </button>
              </span>
            </form>
          </div>

          <div className="stats-grid">
            <Metric
              icon={<Coins size={20} />}
              label="Pantry"
              value={`${formatTokenAmount(snapshot.vaultBalance, snapshot.decimals)} ${displaySymbol}`}
            />
            <Metric
              icon={<Wallet size={20} />}
              label="In your wallet"
              value={`${formatTokenAmount(snapshot.walletBalance, snapshot.decimals)} ${displaySymbol}`}
            />
            <Metric icon={<Droplets size={20} />} label="Servings claimed" value={formatCount(snapshot.totalClaims)} />
            <Metric
              icon={<ShieldCheck size={20} />}
              label="Kitchen"
              value={snapshot.paused ? "Paused" : snapshot.hasClaimed ? "Served" : "Ready"}
            />
          </div>
        </div>
      </section>

      <footer className="contract-row">
        <a href={explorerTokenUrl} target="_blank" rel="noreferrer">
          Token {compactAddress(tokenAddress)}
          <ExternalLink size={15} />
        </a>
        {explorerFaucetUrl ? (
          <a href={explorerFaucetUrl} target="_blank" rel="noreferrer">
            Vault {compactAddress(configuredFaucetAddress || zeroAddress)}
            <ExternalLink size={15} />
          </a>
        ) : null}
      </footer>

      {showInvitation ? <RektaurantInvitation onClose={() => setShowInvitation(false)} /> : null}
    </div>
  );
}

function RektaurantInvitation({ onClose }: { onClose: () => void }) {
  return (
    <div className="invite-overlay" role="presentation">
      <section className="invite-modal" role="dialog" aria-modal="true" aria-labelledby="rektaurant-title">
        <button className="invite-close" type="button" onClick={onClose} aria-label="Close invitation">
          <X size={18} />
        </button>

        <div className="invite-envelope" aria-hidden="true">
          <div className="envelope-flap" />
          <div className="envelope-card">
            <Mail size={34} />
            <span>pappardelle.eth</span>
          </div>
        </div>

        <p className="eyebrow">Claim served</p>
        <h3 id="rektaurant-title">Your table is ready at the Rektaurant</h3>
        <p className="invite-copy">
          Bring your fresh PAPPARDELLE utility token and step into the tool kitchen by pappardelle.eth.
        </p>

        <a className="invite-button" href={rektaurantUrl} target="_blank" rel="noreferrer">
          Open Rektaurant
          <ExternalLink size={17} />
        </a>
      </section>
    </div>
  );
}

function Metric({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <p className="label">{label}</p>
        <p className="value">{value}</p>
      </div>
    </div>
  );
}
